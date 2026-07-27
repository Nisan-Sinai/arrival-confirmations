import { readdir, readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';

import { beforeAll, describe, expect, it } from 'vitest';

/**
 * Nothing server-only may reach a browser (§4.5, §10.6).
 *
 * `lib/server/env.ts` is protected by the `server-only` package, which turns an import
 * from a Client Component into a build error. That is the first line and it is a good
 * one, but it only catches the direct route — a value read into a Server Component and
 * then passed down as a prop crosses the boundary as data, and `server-only` never
 * sees it. This suite reads what was actually emitted.
 *
 * `pnpm scan:secrets` covers the same ground from a script and is what CI runs after
 * the build. This exists so the property is also a *test*: it fails in the same place
 * as every other assertion, and the reason it exists is written next to it rather than
 * living only in a maintenance script. The file was referenced in a comment in
 * `lib/server/env.ts` long before it existed.
 */

const CLIENT_DIR = join(process.cwd(), '.next', 'static');

/** Values that must never appear, and the reason each one is fatal. */
const FORBIDDEN: ReadonlyArray<{ readonly label: string; readonly value: string | undefined }> = [
  { label: 'SUPABASE_SERVICE_ROLE_KEY', value: process.env.SUPABASE_SERVICE_ROLE_KEY },
  { label: 'TOKEN_PEPPER', value: process.env.TOKEN_PEPPER },
  { label: 'IP_HASH_PEPPER', value: process.env.IP_HASH_PEPPER },
];

/** Even the *names* are a map of what to go looking for. */
const FORBIDDEN_NAMES = ['SUPABASE_SERVICE_ROLE_KEY', 'TOKEN_PEPPER', 'IP_HASH_PEPPER'] as const;

async function collectFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) return collectFiles(full);
      return /\.(js|mjs|cjs|css|map|json)$/.test(entry.name) ? [full] : [];
    }),
  );
  return files.flat();
}

let bundle = '';
let fileCount = 0;

beforeAll(async () => {
  // A missing build is a skipped guarantee, so it fails loudly rather than passing.
  const exists = await stat(CLIENT_DIR).catch(() => null);
  expect(
    exists,
    `${CLIENT_DIR} does not exist — run \`pnpm build\` before the security suite.`,
  ).not.toBeNull();

  const files = await collectFiles(CLIENT_DIR);
  fileCount = files.length;
  const contents = await Promise.all(files.map((file) => readFile(file, 'utf8')));
  bundle = contents.join('\n');
});

describe('the browser bundle', () => {
  it('contains something to inspect', () => {
    // Guards against the whole suite passing vacuously on an empty directory.
    expect(fileCount).toBeGreaterThan(0);
    expect(bundle.length).toBeGreaterThan(1000);
  });

  it('does not contain any server-only secret value', () => {
    for (const { label, value } of FORBIDDEN) {
      // Short or absent values are not asserted on: a two-character string would match
      // everywhere and turn this into a false alarm rather than a control.
      if (value === undefined || value.length < 12) continue;
      expect(bundle.includes(value), `${label} was found in the browser bundle`).toBe(false);
    }
  });

  it('does not even name a server-only variable', () => {
    for (const name of FORBIDDEN_NAMES) {
      expect(bundle.includes(name), `${name} is named in the browser bundle`).toBe(false);
    }
  });

  /**
   * A service_role JWT decodes to `"role":"service_role"`. Catching the decoded claim
   * as well as the raw key means a key that arrived by some other path — pasted into a
   * constant, inlined by a bundler — is still caught.
   */
  it('carries no JWT claiming the service role', () => {
    expect(/"role"\s*:\s*"service_role"/.test(bundle)).toBe(false);
    expect(bundle.includes('service_role')).toBe(false);
  });

  it('does not ship a Postgres connection string', () => {
    // TEST_DATABASE_URL and anything like it carry a password in the authority.
    expect(/postgres(ql)?:\/\/[^\s"']*:[^\s"']*@/.test(bundle)).toBe(false);
  });

  /**
   * The publishable values are *supposed* to be here — asserting their absence would
   * be wrong. This checks the anon key is present, so a future change that stops
   * inlining it fails here instead of at a guest's first RSVP.
   */
  it('does ship the public anon key, which is the point of it', () => {
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (anonKey === undefined || anonKey.length < 12) return;
    expect(bundle.includes(anonKey)).toBe(true);
  });
});
