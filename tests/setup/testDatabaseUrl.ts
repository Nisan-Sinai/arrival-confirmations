/**
 * The guard between `pnpm test:rls` and a real guest list.
 *
 * Separated from `database.setup.ts` so it can be tested. That file registers
 * `beforeAll`/`beforeEach` hooks at module scope, so importing it from a unit test both
 * opens a database pool and runs this check against the ambient environment — the test
 * would be exercising the developer's `.env.local` rather than the argument it passed.
 */

export class TestDatabaseConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TestDatabaseConfigError';
  }
}

/** The Supabase project ref inside a connection string or an API URL, if there is one. */
export function extractProjectRef(value: string | undefined): string | null {
  if (value === undefined || value === '') return null;
  // db.<ref>.supabase.co and <ref>.supabase.co, then the pooler's <user>.<ref> form.
  const match =
    /(?:^|[.@/])([a-z]{20})\.supabase\.(?:co|net)/.exec(value) ??
    /\.([a-z]{20})(?::|$)/.exec(value);
  return match?.[1] ?? null;
}

/** The exact opt-in required to truncate a database the application also serves. */
export const DESTRUCTIVE_OPT_IN = 'yes-i-will-lose-this-data';

/**
 * §11 "Never production" and §15 "Verify Preview deployments never connect to the
 * production database".
 *
 * The NODE_ENV check is necessary and nowhere near sufficient, and this was not
 * hypothetical: `.env.local` in this project pointed `TEST_DATABASE_URL` at the same
 * Supabase project the live site runs on. The setup truncates `events`, `rsvps` and
 * `guests` before every test, so one `pnpm test:rls` would have erased a real event and
 * every reply collected for it. Nothing prevented that except those suites happening to
 * contain no tests.
 *
 * So the real guard is the comparison: if the test database is the same project the
 * application itself talks to, refuse. Overriding it takes a deliberate, unmistakable
 * environment variable — the kind nobody sets by accident, and nobody sets twice.
 */
export function resolveTestDatabaseUrl(
  env: Record<string, string | undefined> = process.env,
): string {
  const url = env.TEST_DATABASE_URL;
  if (!url) {
    throw new TestDatabaseConfigError(
      'TEST_DATABASE_URL is not set. The integration and RLS suites need a dedicated ' +
        'test database — see SETUP.md. Run `pnpm test:unit` for the suites that do not.',
    );
  }
  if (!/^postgres(ql)?:\/\//.test(url)) {
    throw new TestDatabaseConfigError(
      'TEST_DATABASE_URL must be a postgresql:// connection string.',
    );
  }
  if (env.NODE_ENV === 'production') {
    throw new TestDatabaseConfigError(
      'Refusing to run destructive test setup with NODE_ENV=production.',
    );
  }

  const testRef = extractProjectRef(url);
  const appRef = extractProjectRef(env.NEXT_PUBLIC_SUPABASE_URL);
  if (
    testRef !== null &&
    appRef !== null &&
    testRef === appRef &&
    env.ALLOW_DESTRUCTIVE_TESTS !== DESTRUCTIVE_OPT_IN
  ) {
    throw new TestDatabaseConfigError(
      `TEST_DATABASE_URL points at the same Supabase project as ` +
        `NEXT_PUBLIC_SUPABASE_URL (${testRef}). These suites TRUNCATE events, rsvps and ` +
        `guests before every test, so running them here would destroy real data.\n\n` +
        `Create a separate Supabase project for tests and point TEST_DATABASE_URL at it. ` +
        `If you genuinely intend to wipe this one, set ` +
        `ALLOW_DESTRUCTIVE_TESTS=${DESTRUCTIVE_OPT_IN}.`,
    );
  }

  return url;
}
