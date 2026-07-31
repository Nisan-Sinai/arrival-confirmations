import { describe, expect, it } from 'vitest';

import { EnvValidationError, parseClientEnv } from '@/lib/env.client';

/**
 * Public environment validation (§4.5, §14).
 *
 * The failure path had no test, which is the half that matters: the success path is
 * exercised by every other suite simply by importing the module, while the error is
 * what a developer sees at 2am when a deploy comes up with a missing variable. §14
 * requires that message to be clear and to name the variable.
 */

const valid = {
  NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: 'a'.repeat(40),
  NEXT_PUBLIC_SITE_URL: 'https://example.test',
};

describe('parseClientEnv', () => {
  it('accepts a complete environment', () => {
    expect(parseClientEnv(valid)).toEqual(valid);
  });

  it('uses Vercel production URL when the explicit site URL is absent in Preview', () => {
    expect(
      parseClientEnv({
        ...valid,
        NEXT_PUBLIC_SITE_URL: undefined,
        NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL: 'arrival-confirmations.vercel.app',
      }).NEXT_PUBLIC_SITE_URL,
    ).toBe('https://arrival-confirmations.vercel.app');
  });

  it('falls back to the current Vercel deployment URL', () => {
    expect(
      parseClientEnv({
        ...valid,
        NEXT_PUBLIC_SITE_URL: undefined,
        NEXT_PUBLIC_VERCEL_URL: 'arrival-confirmations-git-qa-example.vercel.app',
      }).NEXT_PUBLIC_SITE_URL,
    ).toBe('https://arrival-confirmations-git-qa-example.vercel.app');
  });

  it('rejects a missing site URL when no Vercel fallback exists', () => {
    const call = () => parseClientEnv({ ...valid, NEXT_PUBLIC_SITE_URL: undefined });
    expect(call).toThrow(EnvValidationError);
    expect(call).toThrow(/NEXT_PUBLIC_SITE_URL/);
  });

  it('rejects a URL that is not a URL', () => {
    expect(() => parseClientEnv({ ...valid, NEXT_PUBLIC_SUPABASE_URL: 'not-a-url' })).toThrow(
      /NEXT_PUBLIC_SUPABASE_URL/,
    );
  });

  /**
   * A truncated paste is the common way this variable goes wrong, and it fails at the
   * first request rather than at boot — so the length floor is what turns a confusing
   * runtime 401 into a startup error naming the key.
   */
  it('rejects an anon key short enough to be a truncated paste', () => {
    expect(() => parseClientEnv({ ...valid, NEXT_PUBLIC_SUPABASE_ANON_KEY: 'short' })).toThrow(
      /NEXT_PUBLIC_SUPABASE_ANON_KEY/,
    );
  });

  it('reports every problem at once, not just the first', () => {
    try {
      parseClientEnv({});
      expect.unreachable('parseClientEnv should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(EnvValidationError);
      // Three variables are missing; a developer should not fix them one deploy at a time.
      expect((error as EnvValidationError).issues).toHaveLength(3);
    }
  });
});

describe('EnvValidationError', () => {
  it('names the scope and lists the issues in its message', () => {
    const error = new EnvValidationError('client', ['A: חסר', 'B: קצר מדי']);
    expect(error.name).toBe('EnvValidationError');
    expect(error.issues).toEqual(['A: חסר', 'B: קצר מדי']);
    expect(error.message).toContain('client');
    expect(error.message).toContain('A: חסר');
    expect(error.message).toContain('B: קצר מדי');
  });
});
