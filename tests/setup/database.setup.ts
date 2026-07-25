import { Pool } from 'pg';
import { afterAll, beforeAll, beforeEach } from 'vitest';

import './unit.setup';

/**
 * Shared setup for the suites that talk to a real database — `integration` and `rls`
 * (§10.4, §10.6). Both projects run single-fork and non-parallel, so one pool per
 * worker is enough and truncation between tests cannot race another file.
 *
 * §11 requires a deterministic, self-cleaning test database that is never production.
 * Cleanup runs before every test rather than only after, so a suite aborted mid-run
 * (Ctrl-C, a crashed worker) cannot poison the next one with leftover rows.
 */

const APP_TABLES = [
  'invite_sessions',
  'idempotency_keys',
  'audit_logs',
  'rsvps',
  'guests',
  'admin_profiles',
  'events',
] as const;

export class TestDatabaseConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TestDatabaseConfigError';
  }
}

/**
 * §11 "Never production" and §15 "Verify Preview deployments never connect to the
 * production database" — the guard is here, in the only place that hands out a
 * privileged connection to the test suites.
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
  return url;
}

let pool: Pool | null = null;

/** The pool the database-backed suites share. Only valid inside a `beforeAll`-run test. */
export function getTestPool(): Pool {
  if (!pool) {
    throw new TestDatabaseConfigError(
      'The test pool has not been opened. Import this module as a Vitest setup file.',
    );
  }
  return pool;
}

/**
 * Empties every application table that currently exists.
 *
 * The intersection with `information_schema` is deliberate: the suites must stay
 * runnable while migrations are still being added, instead of failing on a table
 * that has not been created yet.
 */
export async function truncateAppTables(client: Pool): Promise<void> {
  const { rows } = await client.query<{ table_name: string }>(
    `SELECT table_name
       FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
        AND table_name = ANY($1::text[])`,
    [[...APP_TABLES]],
  );
  if (rows.length === 0) return;

  const identifiers = rows.map((row) => `public.${JSON.stringify(row.table_name)}`).join(', ');
  await client.query(`TRUNCATE TABLE ${identifiers} RESTART IDENTITY CASCADE`);
}

beforeAll(async () => {
  pool = new Pool({ connectionString: resolveTestDatabaseUrl(), max: 4 });
  // Fail here with a connection error rather than inside the first unrelated test.
  await pool.query('SELECT 1');
});

beforeEach(async () => {
  await truncateAppTables(getTestPool());
});

afterAll(async () => {
  if (!pool) return;
  await truncateAppTables(pool);
  await pool.end();
  pool = null;
});
