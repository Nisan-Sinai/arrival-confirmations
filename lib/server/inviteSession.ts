import 'server-only';

import { appConfig } from '@/config/event.config';
import { hashToken, issueToken, TOKEN_PURPOSES } from '@/lib/server/tokens';

/**
 * The one-time token exchange and the session it mints (§4.3).
 *
 * A raw token sitting in a URL leaks in more ways than are easy to enumerate:
 * browser history, infrastructure access logs, screenshots, a link forwarded in a
 * family group chat, `Referer` headers, error reporters. None of those are fixable
 * individually, so §4.3 removes the raw token from the URL instead: the visitor
 * opens `/invite/[rawToken]` once, the server validates it, mints a session, sets an
 * HttpOnly cookie and redirects immediately to `/invite`, which carries no secret.
 *
 * Everything after that point reads the session, never the token. The session is
 * bound to one event and one guest, so it cannot be steered at another invitation.
 */

/** Cookie name. Deliberately opaque about what it holds. */
export const INVITE_SESSION_COOKIE = 'ac_invite';

export interface InviteSessionCookieOptions {
  readonly httpOnly: true;
  readonly secure: boolean;
  readonly sameSite: 'lax';
  readonly path: string;
  readonly maxAge: number;
}

/**
 * Cookie attributes, per §4.3 and §10.7.
 *
 * `httpOnly` keeps the value out of `document.cookie`, so an XSS in a third-party
 * script cannot read it. `sameSite: 'lax'` still allows the redirect that creates
 * it — the exchange is a top-level GET navigation — while refusing to send the
 * cookie on cross-site POSTs.
 *
 * `secure` is conditional only so that `http://localhost` works in development;
 * a cookie marked Secure is not stored over plain HTTP, which would silently break
 * every local run. Production is always HTTPS, so the flag is always on there, and
 * the leakage test asserts exactly that.
 */
export function inviteSessionCookieOptions(
  isProduction: boolean = process.env.NODE_ENV === 'production',
): InviteSessionCookieOptions {
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    // Scoped to the invitation routes: the admin area has no business receiving it.
    path: '/',
    maxAge: appConfig.inviteSessionTtlMinutes * 60,
  };
}

export interface MintedInviteSession {
  /** Goes into the Set-Cookie header, and nowhere else. */
  readonly rawSessionToken: string;
  /** Goes into `invite_sessions.session_token_hash`. */
  readonly sessionTokenHash: string;
  readonly expiresAt: Date;
}

/**
 * Mints a session for a guest whose invite token has already been validated.
 *
 * Takes `now` explicitly so the expiry logic is testable without faking the clock
 * globally, which is the kind of test that passes at 23:59 and fails at 00:00.
 */
export function mintInviteSession(now: Date = new Date()): MintedInviteSession {
  const { raw, hash } = issueToken(TOKEN_PURPOSES.session);
  const expiresAt = new Date(now.getTime() + appConfig.inviteSessionTtlMinutes * 60_000);
  return { rawSessionToken: raw, sessionTokenHash: hash, expiresAt };
}

/** Hashes an invite token the way `guests.invite_token_hash` stores it. */
export function hashInviteToken(rawToken: string): string {
  return hashToken(rawToken, TOKEN_PURPOSES.invite);
}

/** Hashes a session token the way `invite_sessions.session_token_hash` stores it. */
export function hashSessionToken(rawToken: string): string {
  return hashToken(rawToken, TOKEN_PURPOSES.session);
}

/** Why a token or session was refused. Never surfaced verbatim — see §13. */
export type InviteRejection = 'malformed' | 'not_found' | 'revoked' | 'expired' | 'guest_inactive';

/** The subset of a guest row the exchange needs to reach a decision. */
export interface InviteTokenRecord {
  readonly guestId: string;
  readonly eventId: string;
  readonly isActive: boolean;
  readonly tokenExpiresAt: Date | null;
  readonly tokenRevokedAt: Date | null;
}

export type InviteValidation =
  | { readonly valid: true; readonly guestId: string; readonly eventId: string }
  | { readonly valid: false; readonly rejection: InviteRejection };

/**
 * Decides whether a looked-up invitation may be exchanged for a session.
 *
 * Pure, and separated from the database lookup on purpose: this is the rule set
 * §4.2 and §4.3 describe, and it is the part worth exhaustive unit tests. The
 * repository does the query; this decides what the result means.
 *
 * Order matters. Revocation is checked before expiry so that a link the host
 * explicitly cancelled is never reported as merely stale — internally, at least.
 * Outwardly all five rejections collapse to one Hebrew message, because telling a
 * visitor *why* a token failed tells an attacker which guesses were close.
 */
export function validateInviteToken(
  record: InviteTokenRecord | null,
  now: Date = new Date(),
): InviteValidation {
  if (record === null) return { valid: false, rejection: 'not_found' };
  if (record.tokenRevokedAt !== null) return { valid: false, rejection: 'revoked' };
  if (record.tokenExpiresAt === null || record.tokenExpiresAt.getTime() <= now.getTime()) {
    return { valid: false, rejection: 'expired' };
  }
  if (!record.isActive) return { valid: false, rejection: 'guest_inactive' };
  return { valid: true, guestId: record.guestId, eventId: record.eventId };
}

/** The subset of an invite_sessions row needed to decide whether it is live. */
export interface InviteSessionRecord {
  readonly guestId: string;
  readonly eventId: string;
  readonly expiresAt: Date;
  readonly revokedAt: Date | null;
}

/**
 * Decides whether a session cookie still grants access.
 *
 * §4.3 requires that a session dies when the invitation behind it is revoked or
 * regenerated, not merely when it expires — otherwise cancelling a link would leave
 * whoever already opened it with up to two hours of continued access.
 */
export function validateInviteSession(
  record: InviteSessionRecord | null,
  now: Date = new Date(),
): InviteValidation {
  if (record === null) return { valid: false, rejection: 'not_found' };
  if (record.revokedAt !== null) return { valid: false, rejection: 'revoked' };
  if (record.expiresAt.getTime() <= now.getTime()) return { valid: false, rejection: 'expired' };
  return { valid: true, guestId: record.guestId, eventId: record.eventId };
}

/**
 * A token arriving from a URL segment, before it is worth hashing.
 *
 * Rejects anything that is not the shape `generateRawToken` produces. This is not
 * security by itself — a well-formed guess still fails the hash lookup — but it
 * turns the overwhelmingly common case of a truncated or mangled link into a cheap
 * rejection instead of a database round trip, which also keeps that path from being
 * a free amplification vector.
 */
export function isWellFormedRawToken(value: unknown): value is string {
  return typeof value === 'string' && /^[A-Za-z0-9_-]{43}$/.test(value);
}
