import { readdir, readFile, stat } from 'node:fs/promises';
import { join, relative, sep } from 'node:path';

import { config as loadDotenv } from 'dotenv';

/**
 * Secret scanner for source **and** build output (§10.9), plus the browser-bundle
 * grep required by §4.5.
 *
 * Two independent things are checked, because they fail in different ways:
 *
 * 1. *Patterns* — shapes that are always a mistake in a committed file, such as a
 *    Supabase `service_role` JWT or a pepper assigned inline instead of read from
 *    the environment.
 * 2. *Literal values* — the actual secrets in the current environment. If any of
 *    them appears anywhere in the repository or in `.next/`, a real key has leaked
 *    into code or has been inlined into a bundle. This catches the specific
 *    disaster §4.5 is written to prevent: a privileged key reaching the browser.
 *
 * Exit code is non-zero on the first category of finding, so `pnpm ci` fails loudly.
 */

loadDotenv({ path: '.env.local', quiet: true });

const REPO_ROOT = process.cwd();

/** Directories never worth scanning: not authored, or enormous, or both. */
const SKIPPED_DIRECTORIES = new Set([
  '.git',
  '.next',
  '.stryker-tmp',
  '.vercel',
  'coverage',
  'node_modules',
  'playwright-report',
  'reports',
  'test-results',
]);

/**
 * This file necessarily contains the very patterns it looks for, and `.env.local`
 * is the intended home of real secrets — scanning either would guarantee a finding.
 */
const SKIPPED_FILES = new Set([join('scripts', 'scan-secrets.ts')]);

const SCANNED_EXTENSIONS = new Set([
  '.cjs',
  '.css',
  '.example',
  '.js',
  '.json',
  '.jsx',
  '.md',
  '.mjs',
  '.mts',
  '.sql',
  '.ts',
  '.tsx',
  '.yaml',
  '.yml',
]);

/** Build artefacts that ship to a browser. A secret here is already public. */
const BUILD_OUTPUT_DIR = '.next';

interface SecretPattern {
  readonly id: string;
  readonly description: string;
  readonly pattern: RegExp;
  /**
   * When true, the rule is not applied to test files.
   *
   * Only shape-based rules may set this. A test that assigns a fake pepper to prove
   * a hash actually depends on the pepper is doing the right thing, and flagging it
   * teaches people to ignore the scanner. The value-based checks — the ones that
   * search for the real secrets currently in the environment — still run over tests,
   * so a genuine leak into a fixture is still caught.
   */
  readonly allowedInTests?: boolean;
}

/** Test and fixture files, where a deliberately fake secret is the correct thing. */
const TEST_PATH = /(^|[\\/])(tests|e2e)[\\/]/;

const SOURCE_PATTERNS: readonly SecretPattern[] = [
  {
    id: 'inline-secret-assignment',
    description: 'A secret assigned a literal value instead of being read from the environment',
    pattern:
      /\b(SUPABASE_SERVICE_ROLE_KEY|TOKEN_PEPPER|IP_HASH_PEPPER|TEST_DATABASE_URL)\s*[:=]\s*['"`][^'"`\n]{12,}['"`]/,
    allowedInTests: true,
  },
  {
    id: 'postgres-url-with-password',
    description: 'A Postgres connection string with an embedded password',
    pattern: /postgres(?:ql)?:\/\/[^\s:'"`/]+:(?!password\b)[^\s:@'"`/]{6,}@/,
  },
  {
    id: 'private-key-block',
    description: 'A PEM private key block',
    pattern: /-----BEGIN (?:RSA |EC |OPENSSH |PGP )?PRIVATE KEY-----/,
  },
];

/**
 * Env var names that must never appear in browser-facing output. Next.js only inlines
 * `NEXT_PUBLIC_*`, so any of these in `.next/static` means a server module was pulled
 * into a client bundle.
 */
const PRIVILEGED_ENV_NAMES = [
  'SUPABASE_SERVICE_ROLE_KEY',
  'TOKEN_PEPPER',
  'IP_HASH_PEPPER',
  'TEST_DATABASE_URL',
  'TEST_ADMIN_PASSWORD',
  'TEST_USER_PASSWORD',
] as const;

/**
 * Declared placeholders — from `.env.example` and from the CI workflow's own env
 * block. Matching one proves nothing and would cry wolf.
 *
 * `ci-placeholder-` earns its place the hard way: in CI those values *are* what
 * `process.env` holds, and they are written in `.github/workflows/ci.yml`, so the
 * value-based check reported the workflow file as leaking a live secret on every
 * run. It was right about the letter and wrong about the substance, and a scanner
 * that flags a declared placeholder teaches people to stop reading it.
 */
const PLACEHOLDER_VALUE =
  /^(?:your-|generate-a-|change-me-|ci-placeholder-|postgresql:\/\/postgres:password@)/;

interface Finding {
  readonly rule: string;
  readonly description: string;
  readonly file: string;
  readonly line: number;
  readonly excerpt: string;
}

async function collectFiles(root: string, filter: (path: string) => boolean): Promise<string[]> {
  const found: string[] = [];

  async function walk(directory: string): Promise<void> {
    let entries;
    try {
      entries = await readdir(directory, { withFileTypes: true });
    } catch {
      return; // A directory that does not exist yet (e.g. `.next` before a build).
    }
    for (const entry of entries) {
      const absolute = join(directory, entry.name);
      if (entry.isDirectory()) {
        if (SKIPPED_DIRECTORIES.has(entry.name)) continue;
        await walk(absolute);
        continue;
      }
      if (!entry.isFile()) continue;
      const repoPath = relative(REPO_ROOT, absolute);
      if (SKIPPED_FILES.has(repoPath)) continue;
      if (filter(absolute)) found.push(absolute);
    }
  }

  await walk(root);
  return found;
}

function extensionOf(path: string): string {
  const name = path.slice(path.lastIndexOf(sep) + 1);
  const dot = name.lastIndexOf('.');
  return dot <= 0 ? '' : name.slice(dot);
}

/** Enough context to locate the problem, never enough to reprint the secret itself. */
function excerptAround(line: string, index: number): string {
  const start = Math.max(0, index - 24);
  const raw = line.slice(start, index + 24).trim();
  return raw.length > 60 ? `${raw.slice(0, 57)}…` : raw;
}

/** Anything JWT-shaped. The payload is decoded rather than pattern-matched, because
 *  a base64url substring shifts with the claim's byte offset — a regex over the
 *  encoded form matches only by luck. */
const JWT_SHAPE = /eyJ[A-Za-z0-9_-]{8,}\.(eyJ[A-Za-z0-9_-]{8,})\.[A-Za-z0-9_-]{8,}/g;

/** Roles that must never appear in a committed or shipped JWT (§4.5). */
const FORBIDDEN_JWT_ROLES = new Set(['service_role']);

function decodeJwtPayload(segment: string): Record<string, unknown> | null {
  try {
    const json = Buffer.from(segment, 'base64url').toString('utf8');
    const parsed: unknown = JSON.parse(json);
    return typeof parsed === 'object' && parsed !== null
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null; // JWT-shaped but not a JWT.
  }
}

function scanForPrivilegedJwts(repoPath: string, content: string): Finding[] {
  const findings: Finding[] = [];
  for (const match of content.matchAll(JWT_SHAPE)) {
    const payload = decodeJwtPayload(match[1]!);
    const role = payload?.['role'];
    if (typeof role !== 'string' || !FORBIDDEN_JWT_ROLES.has(role)) continue;
    findings.push({
      rule: 'privileged-jwt',
      description: `A JWT with role "${role}" is present in this file`,
      file: repoPath,
      line: content.slice(0, match.index).split(/\r?\n/).length,
      excerpt: `<${role} JWT redacted>`,
    });
  }
  return findings;
}

function scanContent(
  repoPath: string,
  content: string,
  patterns: readonly SecretPattern[],
): Finding[] {
  const findings: Finding[] = [];
  const lines = content.split(/\r?\n/);
  for (const { id, description, pattern } of patterns) {
    for (const [index, line] of lines.entries()) {
      const match = pattern.exec(line);
      if (!match) continue;
      findings.push({
        rule: id,
        description,
        file: repoPath,
        line: index + 1,
        excerpt: excerptAround(line, match.index),
      });
    }
  }
  return findings;
}

/** The real values currently configured, minus anything that is still a placeholder. */
function liveSecretValues(): { name: string; value: string }[] {
  return PRIVILEGED_ENV_NAMES.flatMap((name) => {
    const value = process.env[name];
    if (!value || value.length < 12 || PLACEHOLDER_VALUE.test(value)) return [];
    return [{ name, value }];
  });
}

async function scanSourceTree(): Promise<Finding[]> {
  const files = await collectFiles(REPO_ROOT, (path) => SCANNED_EXTENSIONS.has(extensionOf(path)));
  const secrets = liveSecretValues();
  const findings: Finding[] = [];

  for (const absolute of files) {
    const repoPath = relative(REPO_ROOT, absolute);
    const content = await readFile(absolute, 'utf8');
    const applicable = TEST_PATH.test(repoPath)
      ? SOURCE_PATTERNS.filter((rule) => rule.allowedInTests !== true)
      : SOURCE_PATTERNS;
    findings.push(...scanContent(repoPath, content, applicable));
    findings.push(...scanForPrivilegedJwts(repoPath, content));

    for (const { name, value } of secrets) {
      const index = content.indexOf(value);
      if (index === -1) continue;
      const line = content.slice(0, index).split(/\r?\n/).length;
      findings.push({
        rule: 'live-secret-in-source',
        description: `The current value of ${name} is written into a repository file`,
        file: repoPath,
        line,
        excerpt: `<${name} value redacted>`,
      });
    }
  }

  return findings;
}

async function scanBuildOutput(): Promise<{ findings: Finding[]; scanned: number }> {
  const buildRoot = join(REPO_ROOT, BUILD_OUTPUT_DIR);
  try {
    await stat(buildRoot);
  } catch {
    return { findings: [], scanned: 0 };
  }

  // `.next` is skipped by the source walk, so descend into it explicitly.
  const files = await collectFiles(buildRoot, (path) => {
    const extension = extensionOf(path);
    return extension === '.js' || extension === '.json' || extension === '.css';
  });

  const secrets = liveSecretValues();
  const findings: Finding[] = [];

  for (const absolute of files) {
    const repoPath = relative(REPO_ROOT, absolute);
    const content = await readFile(absolute, 'utf8');
    findings.push(...scanForPrivilegedJwts(repoPath, content));

    for (const { name, value } of secrets) {
      if (content.includes(value)) {
        findings.push({
          rule: 'live-secret-in-build-output',
          description: `The value of ${name} was inlined into build output`,
          file: repoPath,
          line: 1,
          excerpt: `<${name} value redacted>`,
        });
      }
    }

    // §4.5: the name alone is the tell that a server module reached the browser.
    if (repoPath.includes(join('.next', 'static'))) {
      for (const name of PRIVILEGED_ENV_NAMES) {
        if (!content.includes(name)) continue;
        findings.push({
          rule: 'privileged-env-name-in-browser-bundle',
          description: `${name} is referenced in a browser bundle`,
          file: repoPath,
          line: 1,
          excerpt: name,
        });
      }
    }
  }

  return { findings, scanned: files.length };
}

async function main(): Promise<void> {
  const sourceFindings = await scanSourceTree();
  const build = await scanBuildOutput();
  const findings = [...sourceFindings, ...build.findings];

  if (findings.length > 0) {
    console.error(`✗ secret scan failed — ${findings.length} finding(s):\n`);
    for (const finding of findings) {
      console.error(`  [${finding.rule}] ${finding.file}:${finding.line}`);
      console.error(`      ${finding.description}`);
      console.error(`      ${finding.excerpt}\n`);
    }
    process.exitCode = 1;
    return;
  }

  const buildNote =
    build.scanned === 0
      ? 'no build output found — run `pnpm build` first to cover it'
      : `${build.scanned} build artefact(s) scanned`;
  console.warn(`✓ secret scan clean (${buildNote}).`);
}

// Not top-level `await`: the package is CommonJS, so tsx transpiles this file to CJS.
main().catch((error: unknown) => {
  console.error('✗ secret scan could not complete:', error);
  process.exitCode = 1;
});
