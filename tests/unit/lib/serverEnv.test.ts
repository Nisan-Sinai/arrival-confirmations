import { afterEach, describe, expect, it } from 'vitest';

import { EnvValidationError } from '@/lib/env.client';
import { getServerEnv, parseServerEnv, resetServerEnvCache } from '@/lib/server/env';

/**
 * Server-only environment validation (§4.5, §14).
 *
 * Only the happy path was reachable from the existing suites, and the failure paths
 * are the ones with consequences: a short `SUPABASE_SERVICE_ROLE_KEY` is a truncated
 * paste that fails at the first privileged call, and a shared pepper is a silent
 * cryptographic weakness that nothing downstream would ever complain about.
 */

const valid = {
  SUPABASE_SERVICE_ROLE_KEY: 's'.repeat(40),
  TOKEN_PEPPER: 't'.repeat(40),
  IP_HASH_PEPPER: 'i'.repeat(40),
};

afterEach(() => {
  resetServerEnvCache();
});

describe('parseServerEnv', () => {
  it('accepts a complete environment', () => {
    expect(parseServerEnv(valid)).toEqual(valid);
  });

  it('rejects a truncated service role key and names the variable', () => {
    const call = () => parseServerEnv({ ...valid, SUPABASE_SERVICE_ROLE_KEY: 'short' });
    expect(call).toThrow(EnvValidationError);
    expect(call).toThrow(/SUPABASE_SERVICE_ROLE_KEY/);
  });

  it('rejects a pepper below the minimum length', () => {
    expect(() => parseServerEnv({ ...valid, TOKEN_PEPPER: 'too-short' })).toThrow(/TOKEN_PEPPER/);
    expect(() => parseServerEnv({ ...valid, IP_HASH_PEPPER: 'too-short' })).toThrow(
      /IP_HASH_PEPPER/,
    );
  });

  it('rejects a missing variable', () => {
    const call = () => parseServerEnv({ ...valid, TOKEN_PEPPER: undefined });
    expect(call).toThrow(EnvValidationError);
  });

  /**
   * §4.8 keeps these separate on purpose. Reusing one value means a token hash and an
   * IP hash of the same input collide, so a database dump would let an attacker
   * confirm that a given address submitted a given token — the exact linkage the two
   * peppers exist to prevent. Nothing downstream fails when they match, which is why
   * it has to be caught here.
   */
  it('refuses to let the two peppers be the same value', () => {
    const shared = 'p'.repeat(40);
    const call = () => parseServerEnv({ ...valid, TOKEN_PEPPER: shared, IP_HASH_PEPPER: shared });
    expect(call).toThrow(EnvValidationError);
    expect(call).toThrow(/שונים/);
  });
});

describe('getServerEnv', () => {
  it('reads the process environment and memoises the result', () => {
    const previous = { ...process.env };
    Object.assign(process.env, valid);
    resetServerEnvCache();

    const first = getServerEnv();
    // Mutating the environment after the first read must not change the answer: the
    // cache is what stops every privileged call re-parsing three secrets.
    process.env['TOKEN_PEPPER'] = 'x'.repeat(40);
    expect(getServerEnv()).toBe(first);

    resetServerEnvCache();
    process.env = previous;
  });

  it('re-reads once the cache is dropped', () => {
    const previous = { ...process.env };
    Object.assign(process.env, valid);
    resetServerEnvCache();

    const first = getServerEnv();
    resetServerEnvCache();
    expect(getServerEnv()).not.toBe(first);
    expect(getServerEnv()).toEqual(first);

    resetServerEnvCache();
    process.env = previous;
  });
});
