/**
 * Validation for the connection string the database-backed suites use.
 *
 * An earlier version of this file refused outright when `TEST_DATABASE_URL` named the
 * same Supabase project as the application. That was the right guard for the setup as
 * it stood — it truncated every table before every test, so pointing it at the live
 * project would have erased a real event and every reply on it.
 *
 * The truncation is gone. `database.setup.ts` now runs every test inside a transaction
 * that is always rolled back, so nothing a test writes ever commits and nothing it did
 * not write is ever touched. With no destruction there is nothing to refuse, and the
 * refusal would only have forced a second Supabase project on a product whose entire
 * premise is fitting inside one free tier.
 *
 * What remains is the check that still earns its place: never run against a database
 * the environment believes is production.
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

export function resolveTestDatabaseUrl(
  env: Record<string, string | undefined> = process.env,
): string {
  const url = env.TEST_DATABASE_URL;
  if (!url) {
    throw new TestDatabaseConfigError(
      'TEST_DATABASE_URL is not set. The integration and RLS suites need a database ' +
        'connection string — see SETUP.md. Run `pnpm test:unit` for the suites that do not.',
    );
  }
  if (!/^postgres(ql)?:\/\//.test(url)) {
    throw new TestDatabaseConfigError(
      'TEST_DATABASE_URL must be a postgresql:// connection string.',
    );
  }
  if (env.NODE_ENV === 'production') {
    throw new TestDatabaseConfigError(
      'Refusing to run the database test suites with NODE_ENV=production.',
    );
  }
  return url;
}
