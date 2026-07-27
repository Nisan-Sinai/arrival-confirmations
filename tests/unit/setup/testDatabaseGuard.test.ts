import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  extractProjectRef,
  resolveTestDatabaseUrl,
  TestDatabaseConfigError,
} from '../../setup/testDatabaseUrl';

/**
 * What keeps `pnpm test:rls` away from a real guest list.
 *
 * The protection used to be a refusal: the setup truncated every table before every
 * test, so it checked whether TEST_DATABASE_URL named the same Supabase project as the
 * application and threw if it did. That was correct for a destructive setup and it
 * forced a second Supabase project on a product built to fit in one free tier.
 *
 * The setup is not destructive any more, so the protection moved from a check to a
 * property: every test runs inside a transaction that is always rolled back. The last
 * assertions in this file are what stop truncation from coming back — they read the
 * setup file itself, because a design decision nothing enforces is a comment.
 */

const PROD = 'https://qjzyjetkwqtasqzhvoat.supabase.co';
const SAME = 'postgresql://postgres:pw@db.qjzyjetkwqtasqzhvoat.supabase.co:5432/postgres';
const LOCAL = 'postgresql://postgres@localhost:54322/postgres';

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
    expect(extractProjectRef(LOCAL)).toBeNull();
    expect(extractProjectRef(undefined)).toBeNull();
    expect(extractProjectRef('')).toBeNull();
  });
});

describe('resolveTestDatabaseUrl', () => {
  it('accepts the same project the application serves, because nothing is destroyed', () => {
    expect(
      resolveTestDatabaseUrl({ TEST_DATABASE_URL: SAME, NEXT_PUBLIC_SUPABASE_URL: PROD }),
    ).toBe(SAME);
  });

  it('accepts a local database', () => {
    expect(resolveTestDatabaseUrl({ TEST_DATABASE_URL: LOCAL })).toBe(LOCAL);
  });

  it('refuses an unset or malformed connection string', () => {
    expect(() => resolveTestDatabaseUrl({})).toThrow(/TEST_DATABASE_URL is not set/);
    expect(() => resolveTestDatabaseUrl({ TEST_DATABASE_URL: 'mysql://nope' })).toThrow(
      /postgresql:\/\//,
    );
  });

  it('refuses to run against a database the environment calls production', () => {
    expect(() =>
      resolveTestDatabaseUrl({ TEST_DATABASE_URL: SAME, NODE_ENV: 'production' }),
    ).toThrow(TestDatabaseConfigError);
  });
});

/**
 * The design decision, enforced.
 *
 * Reading the source is blunt, and it is the only thing that actually stops the next
 * person from reaching for TRUNCATE when a test leaves residue. The correct answer to
 * residue here is that there is none: nothing commits.
 */
describe('the database setup stays non-destructive', () => {
  const setupPath = join(process.cwd(), 'tests', 'setup', 'database.setup.ts');

  it('contains no TRUNCATE, DROP or unqualified DELETE', async () => {
    const source = await readFile(setupPath, 'utf8');
    // Comments explain why truncation was removed, so only executable SQL is examined.
    const code = source
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/^\s*(\/\/|\*).*$/gm, '')
      .toUpperCase();

    expect(code).not.toMatch(/\bTRUNCATE\b/);
    expect(code).not.toMatch(/\bDROP\s+TABLE\b/);
    expect(code).not.toMatch(/\bDELETE\s+FROM\b/);
  });

  it('always rolls back — the transaction is closed in a finally', async () => {
    const source = await readFile(setupPath, 'utf8');
    expect(source).toContain('withRollback');
    expect(source).toMatch(/finally\s*\{[\s\S]*rollback/i);
  });
});
