import { describe, expect, it } from 'vitest';

import {
  DESTRUCTIVE_OPT_IN,
  extractProjectRef,
  resolveTestDatabaseUrl,
  TestDatabaseConfigError,
} from '../../setup/testDatabaseUrl';

/**
 * The guard that stands between `pnpm test:rls` and a real guest list.
 *
 * `tests/setup/database.setup.ts` truncates `events`, `rsvps` and `guests` before every
 * single test. Its only protection used to be a NODE_ENV check, which cannot tell a
 * test project from a live one — and in this repository `.env.local` had
 * `TEST_DATABASE_URL` pointing at the same Supabase project serving the real site. One
 * `pnpm test:rls` would have erased a real event and every reply collected for it.
 *
 * These assertions are the reason that can no longer happen quietly.
 */

const PROD = 'https://qjzyjetkwqtasqzhvoat.supabase.co';
const SAME = 'postgresql://postgres:pw@db.qjzyjetkwqtasqzhvoat.supabase.co:5432/postgres';
const OTHER = 'postgresql://postgres:pw@db.abcdefghijklmnopqrst.supabase.co:5432/postgres';

describe('extractProjectRef', () => {
  it('reads the ref from a direct connection string', () => {
    expect(extractProjectRef(SAME)).toBe('qjzyjetkwqtasqzhvoat');
  });

  it('reads the ref from the API URL', () => {
    expect(extractProjectRef(PROD)).toBe('qjzyjetkwqtasqzhvoat');
  });

  it('reads the ref from the pooler form, where it is part of the username', () => {
    expect(
      extractProjectRef(
        'postgresql://postgres.qjzyjetkwqtasqzhvoat:pw@aws-0-eu.pooler.supabase.com:6543/postgres',
      ),
    ).toBe('qjzyjetkwqtasqzhvoat');
  });

  it('has no answer for a local database or a missing value', () => {
    expect(extractProjectRef('postgresql://postgres@localhost:54322/postgres')).toBeNull();
    expect(extractProjectRef(undefined)).toBeNull();
    expect(extractProjectRef('')).toBeNull();
  });
});

describe('resolveTestDatabaseUrl', () => {
  it('accepts a dedicated test project', () => {
    expect(
      resolveTestDatabaseUrl({ TEST_DATABASE_URL: OTHER, NEXT_PUBLIC_SUPABASE_URL: PROD }),
    ).toBe(OTHER);
  });

  /** The case that was live in this repository. */
  it('refuses when the test database is the project the application serves', () => {
    const call = () =>
      resolveTestDatabaseUrl({ TEST_DATABASE_URL: SAME, NEXT_PUBLIC_SUPABASE_URL: PROD });
    expect(call).toThrow(TestDatabaseConfigError);
    expect(call).toThrow(/same Supabase project/);
    // The message has to say what to do, not only what went wrong.
    expect(call).toThrow(/separate Supabase project/);
  });

  it('allows the override, but only with the exact opt-in string', () => {
    const base = { TEST_DATABASE_URL: SAME, NEXT_PUBLIC_SUPABASE_URL: PROD };
    expect(resolveTestDatabaseUrl({ ...base, ALLOW_DESTRUCTIVE_TESTS: DESTRUCTIVE_OPT_IN })).toBe(
      SAME,
    );
    // Anything vaguer must not count — the point is that it cannot be typed by reflex.
    for (const attempt of ['1', 'true', 'yes', 'YES-I-WILL-LOSE-THIS-DATA', '']) {
      expect(() => resolveTestDatabaseUrl({ ...base, ALLOW_DESTRUCTIVE_TESTS: attempt })).toThrow(
        TestDatabaseConfigError,
      );
    }
  });

  it('still refuses an unset or malformed connection string', () => {
    expect(() => resolveTestDatabaseUrl({})).toThrow(/TEST_DATABASE_URL is not set/);
    expect(() => resolveTestDatabaseUrl({ TEST_DATABASE_URL: 'mysql://nope' })).toThrow(
      /postgresql:\/\//,
    );
  });

  it('still refuses to run destructively in production', () => {
    expect(() =>
      resolveTestDatabaseUrl({ TEST_DATABASE_URL: OTHER, NODE_ENV: 'production' }),
    ).toThrow(/NODE_ENV=production/);
  });

  /**
   * A local Postgres has no project ref, so the comparison cannot fire. That is the
   * correct outcome — `supabase start` is a throwaway database and the whole point of
   * the guard is the hosted case.
   */
  it('does not block a local database', () => {
    const local = 'postgresql://postgres@localhost:54322/postgres';
    expect(
      resolveTestDatabaseUrl({ TEST_DATABASE_URL: local, NEXT_PUBLIC_SUPABASE_URL: PROD }),
    ).toBe(local);
  });
});
