import { beforeEach, describe, expect, it } from 'vitest';

import { resetServerEnvCache } from '@/lib/server/env';
import {
  generateRawToken,
  hashIdentity,
  hashToken,
  issueToken,
  safeCompareHashes,
  tokenFingerprint,
  TOKEN_PURPOSES,
} from '@/lib/server/tokens';

/**
 * These tests exist to pin down the security properties, not the implementation.
 * Each one corresponds to a rule the specification states in prose, phrased so that
 * a plausible refactor that breaks the rule turns the test red.
 */
beforeEach(() => {
  resetServerEnvCache();
});

describe('generateRawToken', () => {
  it('yields at least 32 bytes of entropy, per §4.2', () => {
    // base64url of 32 bytes is 43 characters with no padding.
    expect(generateRawToken()).toHaveLength(43);
  });

  it('is URL- and cookie-safe, so a messaging app cannot mangle the link', () => {
    for (let i = 0; i < 50; i += 1) {
      expect(generateRawToken()).toMatch(/^[A-Za-z0-9_-]+$/);
    }
  });

  it('does not repeat', () => {
    const seen = new Set(Array.from({ length: 500 }, generateRawToken));
    expect(seen.size).toBe(500);
  });
});

describe('hashToken', () => {
  it('produces a SHA-256 hex digest', () => {
    expect(hashToken('some-token', TOKEN_PURPOSES.invite)).toMatch(/^[0-9a-f]{64}$/);
  });

  it('never returns the raw token, nor contains it', () => {
    const raw = 'a-recognisable-raw-token-value';
    expect(hashToken(raw, TOKEN_PURPOSES.invite)).not.toContain(raw);
  });

  it('is deterministic, so a lookup can recompute what was stored', () => {
    const raw = generateRawToken();
    expect(hashToken(raw, TOKEN_PURPOSES.invite)).toBe(hashToken(raw, TOKEN_PURPOSES.invite));
  });

  it('separates purposes, so an invite token cannot be replayed as an update token', () => {
    const raw = generateRawToken();
    const asInvite = hashToken(raw, TOKEN_PURPOSES.invite);
    const asUpdate = hashToken(raw, TOKEN_PURPOSES.update);
    const asSession = hashToken(raw, TOKEN_PURPOSES.session);
    expect(new Set([asInvite, asUpdate, asSession]).size).toBe(3);
  });

  it('depends on the pepper, so a database dump alone cannot verify a guess', () => {
    const raw = generateRawToken();
    const withOriginalPepper = hashToken(raw, TOKEN_PURPOSES.invite);

    process.env.TOKEN_PEPPER = 'a-completely-different-pepper-value-0123456789';
    resetServerEnvCache();

    expect(hashToken(raw, TOKEN_PURPOSES.invite)).not.toBe(withOriginalPepper);
  });

  it('refuses an empty token instead of hashing the empty string', () => {
    expect(() => hashToken('', TOKEN_PURPOSES.invite)).toThrow(TypeError);
  });
});

describe('issueToken', () => {
  it('returns a raw token whose hash is the one that will be stored', () => {
    const { raw, hash } = issueToken(TOKEN_PURPOSES.invite);
    expect(hashToken(raw, TOKEN_PURPOSES.invite)).toBe(hash);
  });

  it('mints a distinct token on every call', () => {
    const first = issueToken(TOKEN_PURPOSES.session);
    const second = issueToken(TOKEN_PURPOSES.session);
    expect(first.raw).not.toBe(second.raw);
    expect(first.hash).not.toBe(second.hash);
  });
});

describe('safeCompareHashes', () => {
  it('accepts identical digests', () => {
    const hash = hashToken('token', TOKEN_PURPOSES.invite);
    expect(safeCompareHashes(hash, hash)).toBe(true);
  });

  it('rejects different digests', () => {
    expect(
      safeCompareHashes(
        hashToken('token-a', TOKEN_PURPOSES.invite),
        hashToken('token-b', TOKEN_PURPOSES.invite),
      ),
    ).toBe(false);
  });

  it('returns false on a length mismatch rather than throwing', () => {
    // timingSafeEqual throws here; a thrown error would itself distinguish the case.
    expect(safeCompareHashes('short', 'considerably-longer')).toBe(false);
  });

  it('returns false for non-string input', () => {
    expect(safeCompareHashes(null as unknown as string, 'x')).toBe(false);
  });
});

describe('hashIdentity', () => {
  it('uses a different pepper from hashToken, so the two keyspaces are independent', () => {
    const value = '+972501234567';
    expect(hashIdentity(value, TOKEN_PURPOSES.rateLimit)).not.toBe(
      hashToken(value, TOKEN_PURPOSES.rateLimit),
    );
  });

  it('never returns the identity it was given', () => {
    const ip = '203.0.113.45';
    // §4.8: a raw IP must not be stored anywhere.
    expect(hashIdentity(ip, TOKEN_PURPOSES.rateLimit)).not.toContain(ip);
  });

  it('is stable, so a rate-limit bucket survives across requests', () => {
    expect(hashIdentity('203.0.113.45', TOKEN_PURPOSES.rateLimit)).toBe(
      hashIdentity('203.0.113.45', TOKEN_PURPOSES.rateLimit),
    );
  });

  it('refuses an empty identity', () => {
    expect(() => hashIdentity('', TOKEN_PURPOSES.rateLimit)).toThrow(TypeError);
  });
});

describe('tokenFingerprint', () => {
  it('is short enough to be useless for brute force', () => {
    expect(tokenFingerprint(generateRawToken(), TOKEN_PURPOSES.invite)).toHaveLength(8);
  });

  it('derives from the hash, never from the raw token', () => {
    const raw = generateRawToken();
    const fingerprint = tokenFingerprint(raw, TOKEN_PURPOSES.invite);
    expect(raw).not.toContain(fingerprint);
    expect(hashToken(raw, TOKEN_PURPOSES.invite).startsWith(fingerprint)).toBe(true);
  });

  it('distinguishes two tokens, which is the only reason it exists', () => {
    expect(tokenFingerprint(generateRawToken(), TOKEN_PURPOSES.invite)).not.toBe(
      tokenFingerprint(generateRawToken(), TOKEN_PURPOSES.invite),
    );
  });
});
