import { describe, expect, it } from 'vitest';

import { computeResponseRate, computeRsvpStats } from '@/services/rsvpStats';
import type { Database } from '@/types/database.types';

type Rsvp = Database['public']['Tables']['rsvps']['Row'];

/**
 * Dashboard arithmetic (§8, §8.1).
 *
 * These numbers had no test at all, which is the wrong place in this codebase to have
 * a gap: `expectedAttendees` is the figure a host reads out to a caterer, and
 * `computeResponseRate` is the one §8.1 is emphatic must never be invented. Both are
 * pure functions, so there was never a reason not to cover them.
 */

let sequence = 0;

/**
 * A row with every column present, so the fixture cannot drift from the schema.
 *
 * The return type is annotated and there is deliberately no `as Rsvp` cast. An earlier
 * version had one, and it did precisely what a cast does: it silenced the compiler
 * while the fixture carried `consent_given` and `consent_given_at`, two columns that do
 * not exist — the real one is `consent`. The tests passed, the fixture was wrong, and
 * the comment above it was a claim the code was not backing. Without the cast, a column
 * renamed in a migration fails here at compile time, which is what this was always
 * supposed to do.
 */
function rsvp(overrides: Partial<Rsvp> = {}): Rsvp {
  sequence += 1;
  return {
    id: `rsvp-${sequence}`,
    event_id: 'event-1',
    guest_id: null,
    full_name: 'אורח בדיקה',
    phone: '+972501234567',
    phone_normalized: '+972501234567',
    family_side: null,
    attendance_status: 'attending',
    adults_count: 2,
    children_count: 0,
    babies_count: 0,
    dietary_requirements: null,
    notes: null,
    consent: true,
    source: 'public_form',
    submitted_at: '2026-08-01T09:00:00Z',
    updated_at: '2026-08-01T09:00:00Z',
    update_token_hash: null,
    update_token_expires_at: null,
    ...overrides,
  };
}

describe('computeRsvpStats', () => {
  it('counts each answer into its own bucket', () => {
    const stats = computeRsvpStats([
      rsvp({ attendance_status: 'attending' }),
      rsvp({ attendance_status: 'attending' }),
      rsvp({ attendance_status: 'maybe' }),
      rsvp({ attendance_status: 'not_attending', adults_count: 0 }),
    ]);

    expect(stats.total).toBe(4);
    expect(stats.attending).toBe(2);
    expect(stats.maybe).toBe(1);
    expect(stats.notAttending).toBe(1);
  });

  /**
   * The rule that matters most here. A "maybe" is not a seat, and counting one would
   * overstate the caterer's number by however many people are undecided — which is
   * exactly the population most likely to reply "maybe" and then not come.
   */
  it('takes head counts only from those actually coming', () => {
    const stats = computeRsvpStats([
      rsvp({ attendance_status: 'attending', adults_count: 2, children_count: 3, babies_count: 1 }),
      rsvp({ attendance_status: 'maybe', adults_count: 4, children_count: 4, babies_count: 4 }),
      rsvp({ attendance_status: 'not_attending', adults_count: 0 }),
    ]);

    expect(stats.adults).toBe(2);
    expect(stats.children).toBe(3);
    expect(stats.babies).toBe(1);
    expect(stats.expectedAttendees).toBe(6);
  });

  it('reports zeroes for an event with no replies rather than NaN', () => {
    const stats = computeRsvpStats([]);
    expect(stats.total).toBe(0);
    expect(stats.expectedAttendees).toBe(0);
    expect(stats.receivedToday).toBe(0);
  });

  describe('receivedToday', () => {
    // "Today" is the host's today in Asia/Jerusalem (§5), never the server's.
    const now = new Date('2026-08-15T12:00:00+03:00');

    it('counts a reply submitted earlier the same Israeli day', () => {
      const stats = computeRsvpStats([rsvp({ submitted_at: '2026-08-15T06:00:00+03:00' })], now);
      expect(stats.receivedToday).toBe(1);
    });

    it('excludes a reply from the day before', () => {
      const stats = computeRsvpStats([rsvp({ submitted_at: '2026-08-14T23:30:00+03:00' })], now);
      expect(stats.receivedToday).toBe(0);
    });

    /**
     * 22:00 UTC is already 01:00 the next day in Jerusalem. A reply sent then belongs
     * to the host's today, and a naive UTC comparison would file it under yesterday.
     */
    it('uses the Israeli day boundary, not the UTC one', () => {
      const stats = computeRsvpStats([rsvp({ submitted_at: '2026-08-14T22:30:00Z' })], now);
      expect(stats.receivedToday).toBe(1);
    });
  });
});

describe('computeResponseRate', () => {
  const guest = (
    id: string,
    overrides: Partial<{ is_active: boolean; token_revoked_at: string | null }> = {},
  ) => ({
    id,
    is_active: true,
    token_revoked_at: null,
    ...overrides,
  });

  /**
   * §8.1 forbids inventing a denominator. With no guest list, "one reply" is not
   * 100% — it is a number with nothing to be a proportion of.
   */
  it('returns no percentage at all when there is no guest list', () => {
    const rate = computeResponseRate([], [rsvp({ guest_id: null })]);
    expect(rate.percentage).toBeNull();
    expect(rate.invited).toBe(0);
    expect(rate.responded).toBe(0);
  });

  it('divides replies by invitations', () => {
    const rate = computeResponseRate(
      [guest('g1'), guest('g2'), guest('g3'), guest('g4')],
      [rsvp({ guest_id: 'g1' }), rsvp({ guest_id: 'g2' })],
    );
    expect(rate.percentage).toBe(50);
    expect(rate.invited).toBe(4);
    expect(rate.responded).toBe(2);
  });

  /**
   * A public submission with no matching guest row is a real reply and appears in the
   * totals, but it must not quietly enter the numerator — otherwise a host who
   * invited four people and received one anonymous reply reads 25% from a guest who
   * was never on the list.
   */
  it('ignores a public reply that matches no invited guest', () => {
    const rate = computeResponseRate(
      [guest('g1'), guest('g2')],
      [rsvp({ guest_id: null }), rsvp({ guest_id: 'someone-else' }), rsvp({ guest_id: 'g1' })],
    );
    expect(rate.responded).toBe(1);
    expect(rate.percentage).toBe(50);
  });

  it('counts a guest once even if they replied twice', () => {
    const rate = computeResponseRate(
      [guest('g1'), guest('g2')],
      [rsvp({ guest_id: 'g1' }), rsvp({ guest_id: 'g1' })],
    );
    expect(rate.responded).toBe(1);
    expect(rate.percentage).toBe(50);
  });

  /** A link the host cancelled is not an outstanding request, so it leaves the denominator. */
  it('excludes deactivated and revoked invitations from the denominator', () => {
    const rate = computeResponseRate(
      [
        guest('g1'),
        guest('g2', { is_active: false }),
        guest('g3', { token_revoked_at: '2026-08-01T00:00:00Z' }),
      ],
      [rsvp({ guest_id: 'g1' })],
    );
    expect(rate.invited).toBe(1);
    expect(rate.percentage).toBe(100);
  });

  /**
   * The case the tile actually hits. Nothing in this product creates a `guests` row —
   * the personal-invite-link flow was specified and never built — so before the host's
   * own figure became a fallback, the response rate read "not available" on every event
   * that has ever existed. These assertions are that fallback.
   */
  describe('when the host says how many invitations they sent', () => {
    it('divides replies by that number', () => {
      const rate = computeResponseRate([], [rsvp(), rsvp(), rsvp()], 12);
      expect(rate.percentage).toBe(25);
      expect(rate.invited).toBe(12);
      expect(rate.responded).toBe(3);
    });

    it('counts every reply, because there is no list to match against', () => {
      // guest_id is null on a public submission, which is all of them here.
      const rate = computeResponseRate([], [rsvp({ guest_id: null }), rsvp({ guest_id: null })], 4);
      expect(rate.percentage).toBe(50);
    });

    /**
     * The link is forwarded around a WhatsApp group, so more replies than invitations
     * is normal rather than an error. "137% responded" would look like a bug in the
     * product to the one host it happens to.
     */
    it('caps at 100 when the link travelled further than the host expected', () => {
      const rate = computeResponseRate([], [rsvp(), rsvp(), rsvp(), rsvp(), rsvp()], 3);
      expect(rate.percentage).toBe(100);
      expect(rate.responded).toBe(5);
    });

    it('still reports nothing when the host left the field empty', () => {
      expect(computeResponseRate([], [rsvp()], null).percentage).toBeNull();
    });

    it('refuses zero as a denominator rather than dividing by it', () => {
      expect(computeResponseRate([], [rsvp()], 0).percentage).toBeNull();
    });

    /** A real invite list is a better answer than an estimate, so it wins. */
    it('prefers real guest rows over the host’s estimate', () => {
      const rate = computeResponseRate(
        [guest('g1'), guest('g2')],
        [rsvp({ guest_id: 'g1' })],
        1000,
      );
      expect(rate.invited).toBe(2);
      expect(rate.percentage).toBe(50);
    });
  });

  it('rounds to a whole percentage', () => {
    const rate = computeResponseRate(
      [guest('g1'), guest('g2'), guest('g3')],
      [rsvp({ guest_id: 'g1' })],
    );
    // 1/3 is 33.33…, and a dashboard showing "33.333333%" is a bug in presentation.
    expect(rate.percentage).toBe(33);
  });
});
