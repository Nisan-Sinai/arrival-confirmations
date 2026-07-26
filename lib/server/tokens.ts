import 'server-only';

import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

import { getServerEnv } from '@/lib/server/env';

/**
 * Token generation, hashing and comparison (§4.2, §4.3, §6.3, §6.4).
 *
 * Three rules hold for every token in the system, and this module is the only place
 * that can break them:
 *
 * 1. A raw token is generated once, handed to exactly one caller, and never stored.
 *    What reaches the database is `sha256(pepper + purpose + raw)`.
 * 2. The pepper comes from the environment, never the database. A stolen database
 *    dump therefore cannot verify a guessed token — the attacker would also need
 *    the deployment secret.
 * 3. The purpose is mixed into the hash, so a value that is a valid invite token
 *    cannot be replayed as an update token or a session token even if it leaked.
 *
 * `server-only` makes importing this from a Client Component a build error.
 */

/** §4.2: at least 32 bytes of CSPRNG output, rendered base64url. */
const TOKEN_BYTES = 32;

/**
 * Domain separation. Hashing the purpose alongside the secret means the three token
 * families live in disjoint keyspaces: the same raw string hashes to three different
 * values, so a lookup by one kind can never match a token issued as another.
 */
export const TOKEN_PURPOSES = {
  /** Personal invitation link, `/invite/[token]` (§4.2). */
  invite: 'invite',
  /** Cookie-borne session minted by the token exchange (§4.3). */
  session: 'session',
  /** Self-service RSVP edit credential (§6.4). */
  update: 'update',
  /** Idempotency key supplied by the client (§6.3). */
  idempotency: 'idempotency',
  /** Rate-limit identity, hashed before it is ever stored (§4.8). */
  rateLimit: 'rate_limit',
} as const;

export type TokenPurpose = (typeof TOKEN_PURPOSES)[keyof typeof TOKEN_PURPOSES];

/**
 * A freshly minted token. The raw value exists only in memory, on the path to the
 * one place that needs it — a WhatsApp link, a Set-Cookie header. The hash is what
 * gets persisted.
 */
export interface IssuedToken {
  readonly raw: string;
  readonly hash: string;
}

/**
 * Generates a token that is safe in a URL and in a cookie.
 *
 * base64url avoids the `+`, `/` and `=` that would otherwise need escaping — and
 * that get mangled when a guest's messaging app "helpfully" reformats a link.
 */
export function generateRawToken(): string {
  return randomBytes(TOKEN_BYTES).toString('base64url');
}

/**
 * Hashes a raw token for storage or lookup.
 *
 * Deterministic on purpose: a lookup has to be able to recompute the stored value
 * from what the visitor presented. That rules out a salted password hash here, and
 * is why the pepper carries the secrecy instead.
 */
export function hashToken(raw: string, purpose: TokenPurpose): string {
  if (typeof raw !== 'string' || raw.length === 0) {
    throw new TypeError('Refusing to hash an empty token.');
  }
  const { TOKEN_PEPPER } = getServerEnv();
  return createHash('sha256').update(`${TOKEN_PEPPER}:${purpose}:${raw}`).digest('hex');
}

/** Mints a raw token and its stored hash together, so the two cannot drift apart. */
export function issueToken(purpose: TokenPurpose): IssuedToken {
  const raw = generateRawToken();
  return { raw, hash: hashToken(raw, purpose) };
}

/**
 * Constant-time comparison of two hex digests.
 *
 * `===` on a hash leaks, through timing, how many leading characters an attacker
 * guessed correctly. That is only a practical attack under narrow conditions, but
 * the fix costs nothing and removes the need to reason about whether it applies.
 */
export function safeCompareHashes(a: string, b: string): boolean {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const bufferA = Buffer.from(a, 'utf8');
  const bufferB = Buffer.from(b, 'utf8');
  // timingSafeEqual throws on a length mismatch, which would itself be a signal.
  if (bufferA.length !== bufferB.length) return false;
  return timingSafeEqual(bufferA, bufferB);
}

/**
 * Hashes a value that identifies a rate-limit subject — an IP, a phone number, an
 * email (§4.8).
 *
 * Uses `IP_HASH_PEPPER`, deliberately not `TOKEN_PEPPER`: rotating the token pepper
 * to invalidate every outstanding invitation should not also wipe the rate-limit
 * state, and a leak of one pepper must not compromise the other. `lib/server/env.ts`
 * refuses to start if the two are equal.
 */
export function hashIdentity(value: string, purpose: TokenPurpose): string {
  if (typeof value !== 'string' || value.length === 0) {
    throw new TypeError('Refusing to hash an empty identity.');
  }
  const { IP_HASH_PEPPER } = getServerEnv();
  return createHash('sha256').update(`${IP_HASH_PEPPER}:${purpose}:${value}`).digest('hex');
}

/**
 * Redacts a token for a log line or an error message.
 *
 * §4.2 forbids raw tokens in logs outright. Occasionally an operator still needs to
 * correlate "the link that failed" with "the link that was issued", so this returns
 * a short prefix of the *hash* — never of the raw value, which would narrow a brute
 * force — and only enough of it to distinguish one token from another.
 */
export function tokenFingerprint(raw: string, purpose: TokenPurpose): string {
  return hashToken(raw, purpose).slice(0, 8);
}
