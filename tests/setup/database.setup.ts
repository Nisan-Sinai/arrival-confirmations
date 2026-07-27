import { Pool, type PoolClient } from 'pg';
import { afterAll, beforeAll } from 'vitest';

import './unit.setup';
import { resolveTestDatabaseUrl, TestDatabaseConfigError } from './testDatabaseUrl';

// Re-exported so the database-backed suites import them from one place.
export { resolveTestDatabaseUrl, TestDatabaseConfigError };

/**
 * Shared setup for the suites that talk to a real database — `integration` and `rls`
 * (§10.4, §10.6).
 *
 * THIS FILE USED TO TRUNCATE EVERY APPLICATION TABLE BEFORE EVERY TEST, and that was
 * the single most dangerous thing in the repository. `.env.local` pointed
 * `TEST_DATABASE_URL` at the same Supabase project serving the live site, so one
 * `pnpm test:rls` would have erased a real event and every reply on it. The only thing
 * preventing that was those suites happening to contain no tests.
 *
 * The fix is not a louder warning, and it is not a second Supabase project. It is that
 * these suites no longer leave anything to clean up: every test runs inside a
 * transaction that is always rolled back, so rows it creates never commit and rows it
 * did not create are never touched. That makes them safe against any database — which
 * is the point, because a suite nobody dares run protects nothing.
 *
 * The rule this file exists to enforce: **no test may write outside `withRollback`.**
 */

let pool: Pool | null = null;

/** The pool the database-backed suites share. Only valid inside a test. */
export function getTestPool(): Pool {
  if (!pool) {
    throw new TestDatabaseConfigError(
      'The test pool has not been opened. Import this module as a Vitest setup file.',
    );
  }
  return pool;
}

/**
 * Runs a test body inside a transaction and rolls it back, always.
 *
 * One connection for the whole body: a second connection would not see the uncommitted
 * rows the first created, which is the usual way this pattern gets quietly broken.
 *
 * The rollback sits in `finally` and its own failure is swallowed. If the body threw
 * because the transaction was already aborted, the rollback still has to run — and its
 * error must not replace the assertion failure that actually explains the problem.
 */
export async function withRollback<T>(body: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await getTestPool().connect();
  try {
    await client.query('begin');
    return await body(client);
  } finally {
    await client.query('rollback').catch(() => undefined);
    client.release();
  }
}

beforeAll(async () => {
  pool = new Pool({ connectionString: resolveTestDatabaseUrl(), max: 4 });
  // Fail here with a connection error rather than inside the first unrelated test.
  await pool.query('select 1');
});

afterAll(async () => {
  if (!pool) return;
  await pool.end();
  pool = null;
});
