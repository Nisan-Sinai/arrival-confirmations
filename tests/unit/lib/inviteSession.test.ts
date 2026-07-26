import { describe, expect, it } from 'vitest';

import { appConfig } from '@/config/event.config';
import {
  hashInviteToken,
  hashSessionToken,
  INVITE_SESSION_COOKIE,
  inviteSessionCookieOptions,
  isWellFormedRawToken,
  mintInviteSession,
  validateInviteSession,
  validateInviteToken,
  type InviteSessionRecord,
  type InviteTokenRecord,
} from '@/lib/server/inviteSession';
import { generateRawToken } from '@/lib/server/tokens';

const NOW = new Date('2026-08-01T12:00:00Z');
const minutes = (n: number) => new Date(NOW.getTime() + n * 60_000);

const liveToken = (overrides: Partial<InviteTokenRecord> = {}): InviteTokenRecord => ({
  guestId: 'guest-1',
  eventId: 'event-1',
  isActive: true,
  tokenExpiresAt: minutes(60),
  tokenRevokedAt: null,
  ...overrides,
});

describe('inviteSessionCookieOptions', () => {
  it('is HttpOnly, so an XSS cannot read it from document.cookie', () => {
    expect(inviteSessionCookieOptions(true).httpOnly).toBe(true);
  });

  it('is Secure in production', () => {
    // §10.7 asserts this against a real response too; this pins the source of truth.
    expect(inviteSessionCookieOptions(true).secure).toBe(true);
  });

  it('drops Secure outside production, or localhost would never keep the cookie', () => {
    expect(inviteSessionCookieOptions(false).secure).toBe(false);
  });

  it('uses SameSite=Lax, which still permits the redirect that creates it', () => {
    expect(inviteSessionCookieOptions(true).sameSite).toBe('lax');
  });

  it('expires with the configured session lifetime', () => {
    expect(inviteSessionCookieOptions(true).maxAge).toBe(appConfig.inviteSessionTtlMinutes * 60);
  });

  it('has an opaque name that does not advertise its contents', () => {
    expect(INVITE_SESSION_COOKIE).not.toMatch(/token|secret|invite_token/i);
  });
});

describe('mintInviteSession', () => {
  it('returns a raw token whose hash is what gets stored', () => {
    const session = mintInviteSession(NOW);
    expect(hashSessionToken(session.rawSessionToken)).toBe(session.sessionTokenHash);
  });

  it('never puts the raw token in the stored hash', () => {
    const session = mintInviteSession(NOW);
    expect(session.sessionTokenHash).not.toContain(session.rawSessionToken);
  });

  it('expires after the configured lifetime, measured from the given instant', () => {
    const session = mintInviteSession(NOW);
    expect(session.expiresAt.getTime()).toBe(
      NOW.getTime() + appConfig.inviteSessionTtlMinutes * 60_000,
    );
  });

  it('mints a distinct session every time', () => {
    const first = mintInviteSession(NOW);
    const second = mintInviteSession(NOW);
    expect(first.rawSessionToken).not.toBe(second.rawSessionToken);
  });

  it('hashes a session token differently from an invite token', () => {
    // Domain separation: a leaked session token must not be replayable as an invite.
    const raw = generateRawToken();
    expect(hashSessionToken(raw)).not.toBe(hashInviteToken(raw));
  });
});

describe('validateInviteToken', () => {
  it('accepts a live invitation', () => {
    expect(validateInviteToken(liveToken(), NOW)).toEqual({
      valid: true,
      guestId: 'guest-1',
      eventId: 'event-1',
    });
  });

  it.each([
    ['an unknown token', null, 'not_found'],
    ['a revoked token', liveToken({ tokenRevokedAt: minutes(-10) }), 'revoked'],
    ['an expired token', liveToken({ tokenExpiresAt: minutes(-1) }), 'expired'],
    ['a token with no expiry at all', liveToken({ tokenExpiresAt: null }), 'expired'],
    ['a deactivated guest', liveToken({ isActive: false }), 'guest_inactive'],
  ])('refuses %s', (_label, record, rejection) => {
    expect(validateInviteToken(record, NOW)).toEqual({ valid: false, rejection });
  });

  it('reports revocation ahead of expiry', () => {
    // A link the host cancelled should never read internally as merely stale.
    const both = liveToken({ tokenRevokedAt: minutes(-10), tokenExpiresAt: minutes(-5) });
    expect(validateInviteToken(both, NOW)).toEqual({ valid: false, rejection: 'revoked' });
  });

  it('treats the expiry instant itself as expired', () => {
    expect(validateInviteToken(liveToken({ tokenExpiresAt: NOW }), NOW).valid).toBe(false);
  });

  it('never returns guest data alongside a rejection', () => {
    const rejected = validateInviteToken(null, NOW);
    // §4.2: a failed lookup must not disclose anything about any guest.
    expect(Object.keys(rejected)).toEqual(['valid', 'rejection']);
  });
});

describe('validateInviteSession', () => {
  const liveSession = (overrides: Partial<InviteSessionRecord> = {}): InviteSessionRecord => ({
    guestId: 'guest-1',
    eventId: 'event-1',
    expiresAt: minutes(30),
    revokedAt: null,
    ...overrides,
  });

  it('accepts a live session', () => {
    expect(validateInviteSession(liveSession(), NOW)).toEqual({
      valid: true,
      guestId: 'guest-1',
      eventId: 'event-1',
    });
  });

  it.each([
    ['a missing session', null, 'not_found'],
    ['a revoked session', liveSession({ revokedAt: minutes(-1) }), 'revoked'],
    ['an expired session', liveSession({ expiresAt: minutes(-1) }), 'expired'],
  ])('refuses %s', (_label, record, rejection) => {
    expect(validateInviteSession(record, NOW)).toEqual({ valid: false, rejection });
  });

  it('dies the moment the invitation behind it is revoked, not merely on expiry', () => {
    // §4.3: otherwise cancelling a link leaves whoever already opened it with up to
    // a full session lifetime of continued access.
    const revokedButUnexpired = liveSession({ revokedAt: minutes(-1), expiresAt: minutes(60) });
    expect(validateInviteSession(revokedButUnexpired, NOW).valid).toBe(false);
  });
});

describe('isWellFormedRawToken', () => {
  it('accepts what generateRawToken produces', () => {
    for (let i = 0; i < 25; i += 1) {
      expect(isWellFormedRawToken(generateRawToken())).toBe(true);
    }
  });

  it.each([
    ['an empty string', ''],
    ['a truncated link', generateRawToken().slice(0, 20)],
    ['base64 padding, which base64url never emits', `${'a'.repeat(42)}=`],
    ['a path traversal attempt', '../../../etc/passwd'],
    ['a SQL fragment', "' or 1=1 --"],
    ['a non-string', 12345],
    ['null', null],
  ])('rejects %s', (_label, value) => {
    expect(isWellFormedRawToken(value)).toBe(false);
  });
});
