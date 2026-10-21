import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const levels = ['info', 'low', 'moderate', 'high', 'critical'];
const advisoryId = '1240992';
const ghsa = 'GHSA-vfj7-8cjw-p6xm';
const developmentPath = '.>eslint-config-next>@next/eslint-plugin-next>fast-glob>micromatch>braces';
const expiresAt = Date.parse('2026-11-04T00:00:00Z');
const isObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);

// Never filter pnpm's report: even the known development finding is fatal in production.
export function evaluateAudit(report, scope, manifest, now = Date.now()) {
  if (!['prod', 'full'].includes(scope) || !Number.isFinite(now)) {
    throw new Error('Invalid audit scope or clock');
  }
  const counts = report?.metadata?.vulnerabilities;
  if (
    !isObject(report) ||
    Object.hasOwn(report, 'error') ||
    Object.hasOwn(report, 'errors') ||
    !isObject(report.advisories) ||
    !isObject(counts) ||
    Object.keys(counts).length !== levels.length ||
    !levels.every((level) => Number.isSafeInteger(counts[level]) && counts[level] >= 0)
  ) {
    throw new Error('Missing, malformed, or failed pnpm audit report');
  }
  const ids = Object.keys(report.advisories);
  const total = levels.reduce((sum, level) => sum + counts[level], 0);
  if (ids.length === 0 && total === 0) return { exception: false };
  if (scope === 'prod') throw new Error('Production dependency vulnerabilities are forbidden');
  const advisory = report.advisories[advisoryId];
  if (
    ids.length !== 1 ||
    ids[0] !== advisoryId ||
    total !== 1 ||
    counts.high !== 1 ||
    advisory?.id !== Number(advisoryId) ||
    advisory.github_advisory_id !== ghsa ||
    advisory.module_name !== 'braces' ||
    advisory.severity !== 'high' ||
    advisory.patched_versions !== null ||
    advisory.patched_versions_unpublished !== true ||
    !Array.isArray(advisory.findings) ||
    advisory.findings.length === 0 ||
    !advisory.findings.every(
      (finding) =>
        finding?.version === '3.0.3' &&
        finding.dev === true &&
        Array.isArray(finding.paths) &&
        finding.paths.length > 0 &&
        finding.paths.every((path) => path === developmentPath),
    ) ||
    typeof manifest?.devDependencies?.['eslint-config-next'] !== 'string' ||
    ['dependencies', 'optionalDependencies', 'peerDependencies'].some((field) =>
      Object.hasOwn(manifest?.[field] ?? {}, 'eslint-config-next'),
    )
  ) {
    throw new Error('Unapproved advisory, count, version, or non-development dependency path');
  }
  if (now >= expiresAt) throw new Error(`Temporary development exception for ${ghsa} expired`);
  return { exception: true };
}

export function evaluateAuditRun(run, scope, manifest, now = Date.now()) {
  if (run.error || run.signal || ![0, 1].includes(run.status) || run.stderr?.trim()) {
    throw new Error(
      `pnpm audit (${scope}) failed: ${run.error?.message ?? run.stderr ?? run.status}`,
    );
  }
  let report;
  try {
    report = JSON.parse(run.stdout);
  } catch {
    throw new Error(`pnpm audit (${scope}) did not return valid JSON`);
  }
  const result = evaluateAudit(report, scope, manifest, now);
  if (run.status !== (result.exception ? 1 : 0)) {
    throw new Error(`pnpm audit (${scope}) exit status disagrees with its report`);
  }
  return result;
}

export function main() {
  const manifest = JSON.parse(readFileSync('package.json', 'utf8'));
  if (!process.env.npm_execpath)
    throw new Error('Run this gate through pnpm check:dependency-audit');
  for (const scope of ['prod', 'full']) {
    const run = spawnSync(
      process.execPath,
      [
        process.env.npm_execpath,
        'audit',
        ...(scope === 'prod' ? ['--prod'] : []),
        '--json',
        '--audit-level',
        'low',
      ],
      { encoding: 'utf8', timeout: 120_000, maxBuffer: 10 * 1024 * 1024 },
    );
    const result = evaluateAuditRun(run, scope, manifest);
    if (result.exception) {
      process.stdout.write(
        `::warning title=Temporary development vulnerability::${ghsa}: braces 3.0.3 remains in the exact ESLint dev-only path. NOT a clean full audit. Exception expires 2026-11-04 00:00 UTC; remove it when a patched version is published.\n`,
      );
    } else {
      process.stdout.write(`pnpm audit (${scope}): zero vulnerabilities.\n`);
    }
  }
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  try {
    main();
  } catch (error) {
    process.stderr.write(`Dependency audit gate failed: ${error.message}\n`);
    process.exitCode = 1;
  }
}
