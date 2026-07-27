import type { Database } from '@/types/database.types';

/**
 * Dashboard arithmetic (§8, §8.1).
 *
 * Pure functions over rows the caller already fetched, so every number the host sees
 * is unit-testable without a database. The response rate in particular is worth
 * isolating: §8.1 is emphatic that it must never be invented, and the rule is easier
 * to get wrong than it looks.
 */

type Rsvp = Database['public']['Tables']['rsvps']['Row'];

export interface RsvpStats {
  readonly total: number;
  readonly attending: number;
  readonly notAttending: number;
  readonly maybe: number;
  readonly adults: number;
  readonly children: number;
  readonly babies: number;
  /** Everyone expected through the door — the number the caterer needs. */
  readonly expectedAttendees: number;
  readonly receivedToday: number;
}

/** Midnight in the event's zone, so "today" means the host's today (§5). */
function startOfTodayInJerusalem(now: Date): number {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jerusalem',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
  return new Date(`${parts}T00:00:00+03:00`).getTime();
}

export function computeRsvpStats(rsvps: readonly Rsvp[], now: Date = new Date()): RsvpStats {
  const since = startOfTodayInJerusalem(now);
  const attendingRows = rsvps.filter((r) => r.attendance_status === 'attending');

  return {
    total: rsvps.length,
    attending: attendingRows.length,
    notAttending: rsvps.filter((r) => r.attendance_status === 'not_attending').length,
    maybe: rsvps.filter((r) => r.attendance_status === 'maybe').length,
    // Head counts come only from those actually coming: a declined RSVP carries
    // zeroes by constraint, and a "maybe" would inflate the caterer's number.
    adults: attendingRows.reduce((sum, r) => sum + r.adults_count, 0),
    children: attendingRows.reduce((sum, r) => sum + r.children_count, 0),
    babies: attendingRows.reduce((sum, r) => sum + r.babies_count, 0),
    expectedAttendees: attendingRows.reduce(
      (sum, r) => sum + r.adults_count + r.children_count + r.babies_count,
      0,
    ),
    receivedToday: rsvps.filter((r) => new Date(r.submitted_at).getTime() >= since).length,
  };
}

export interface ResponseRate {
  /** Null when there is no guest list — §8.1 forbids inventing a denominator. */
  readonly percentage: number | null;
  readonly responded: number;
  readonly invited: number;
}

/**
 * Response rate (§8.1).
 *
 * Two denominators, in order of how much they can be trusted.
 *
 * A per-guest invite list is the better answer, so it wins when it exists: the
 * denominator is invited *guest records* and the numerator counts only replies linked
 * to one of them. A public submission from somebody who was never on the list is a real
 * reply and appears in every other total, but it must not quietly enter this one —
 * otherwise inviting four people and receiving one reply from a stranger reads as 25%
 * of a set that stranger was never in.
 *
 * Failing that, `expectedGuests` — the number of invitations the host says they sent.
 * This is the case that actually occurs: the product sends one unguessable link
 * forwarded around a WhatsApp group, so there are no guest rows and there never were.
 * Before this fallback existed the tile read "not available" on every event ever
 * created, which is a correct answer to a question nobody could make answerable.
 *
 * And failing both, no percentage at all. §8.1 forbids inventing a denominator, and a
 * host who does not know how many invitations went out is exactly whose number would
 * have to be invented.
 *
 * Revoked and deactivated invitations are excluded from the guest count, because a link
 * the host cancelled is not an outstanding request.
 */
export function computeResponseRate(
  guests: readonly { id: string; is_active: boolean; token_revoked_at: string | null }[],
  rsvps: readonly Pick<Rsvp, 'guest_id'>[],
  expectedGuests: number | null = null,
): ResponseRate {
  const invited = guests.filter((g) => g.is_active && g.token_revoked_at === null);

  if (invited.length > 0) {
    const invitedIds = new Set(invited.map((g) => g.id));
    const responded = new Set(
      rsvps.map((r) => r.guest_id).filter((id): id is string => id !== null && invitedIds.has(id)),
    ).size;

    return {
      percentage: Math.round((responded / invited.length) * 100),
      responded,
      invited: invited.length,
    };
  }

  if (expectedGuests !== null && expectedGuests > 0) {
    // Every reply counts here, because without a guest list there is nothing to match
    // against — the host's own figure is the whole population.
    const responded = rsvps.length;
    return {
      // Capped: more replies than invitations means the link was forwarded further than
      // the host expected, which is a good problem and not a 140% one.
      percentage: Math.min(100, Math.round((responded / expectedGuests) * 100)),
      responded,
      invited: expectedGuests,
    };
  }

  return { percentage: null, responded: 0, invited: 0 };
}
