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
 * The denominator is invited *guest records*, not RSVPs. A public submission with no
 * matching guest row is a real response and appears in the totals, but it must not
 * quietly change the denominator — otherwise inviting nobody and receiving one reply
 * would read as 100%.
 *
 * Revoked and deactivated invitations are excluded, because a link the host
 * cancelled is not an outstanding request. That choice is documented here because
 * §8.1 requires it to be stated rather than assumed.
 */
export function computeResponseRate(
  guests: readonly { id: string; is_active: boolean; token_revoked_at: string | null }[],
  rsvps: readonly Pick<Rsvp, 'guest_id'>[],
): ResponseRate {
  const invited = guests.filter((g) => g.is_active && g.token_revoked_at === null);
  if (invited.length === 0) {
    // No guest list: the honest answer is "not available", never a percentage.
    return { percentage: null, responded: 0, invited: 0 };
  }

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
