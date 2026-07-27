import { TZDate } from '@date-fns/tz';
import { HDate } from '@hebcal/core';

import { APP_LOCALE, EVENT_TIMEZONE } from '@/config/event.config';

/**
 * Date presentation for the host surface.
 *
 * The dashboard was printing `event_date` exactly as Postgres returns it — `2026-09-04`
 * — on a Hebrew, right-to-left page whose entire guest-facing side renders the same
 * value as "ביום שישי, ד׳ באלול". A host reading their own event list should not be
 * shown an ISO string.
 *
 * Everything here resolves in Asia/Jerusalem unconditionally, never in the viewer's
 * zone (§5). A host checking replies from abroad must see the date of their event, not
 * the date it is where they are standing.
 */

const HEBREW_WEEKDAYS = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'] as const;

/**
 * A single gate for "is this actually a date".
 *
 * Checking for `undefined` alone is not enough, and the first version of this module
 * made exactly that mistake: `'not-a-date'.split('-').map(Number)` yields three NaNs,
 * not three undefineds, so a malformed value sailed through the guard and reached
 * `Intl.DateTimeFormat`, which throws a RangeError and takes the whole page with it.
 * `event_date` is a Postgres `date` and cannot be malformed in production — but a
 * fixture, a hand-written seed or a future column change can all produce one, and an
 * invitation is the last place that should render a stack trace.
 */
function toParts(isoDate: string | null): { y: number; m: number; d: number } | null {
  if (isoDate === null || !/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return null;
  const [y, m, d] = isoDate.split('-').map(Number) as [number, number, number];
  if (m < 1 || m > 12 || d < 1 || d > 31) return null;
  return { y, m, d };
}

/** `2026-09-04` → `4.9.2026`. */
export function formatEventDate(isoDate: string | null): string {
  if (toParts(isoDate) === null) return '—';
  const zoned = new TZDate(`${isoDate}T00:00:00`, EVENT_TIMEZONE);
  return new Intl.DateTimeFormat(APP_LOCALE, {
    day: 'numeric',
    month: 'numeric',
    year: 'numeric',
    timeZone: EVENT_TIMEZONE,
  }).format(zoned);
}

/** `2026-09-04` → `שישי`. */
export function formatEventWeekday(isoDate: string | null): string {
  if (toParts(isoDate) === null) return '';
  // `getDay()` is 0–6 by definition and the tuple has seven entries, so a `?? ''`
  // fallback here would be a branch no input can ever take — dead code that reads as
  // caution. The assertion says the same thing honestly.
  return HEBREW_WEEKDAYS[new TZDate(`${isoDate}T00:00:00`, EVENT_TIMEZONE).getDay()]!;
}

/** `2026-09-04` → `ד׳ באלול תשפ״ו`. */
export function formatHebrewDate(isoDate: string | null): string {
  const parts = toParts(isoDate);
  if (parts === null) return '';
  return new HDate(new Date(parts.y, parts.m - 1, parts.d)).renderGematriya(true);
}

/**
 * Whole days from today to the event, in the event's zone.
 *
 * Both ends are floored to midnight in Asia/Jerusalem before subtracting. Comparing
 * raw instants would make an event at 19:00 tonight read as "0 days" until 19:00 and
 * then flip, and an event tomorrow morning read as today.
 */
export function daysUntilEvent(isoDate: string | null, now: Date = new Date()): number | null {
  if (toParts(isoDate) === null) return null;
  const startOfEventDay = new TZDate(`${isoDate}T00:00:00`, EVENT_TIMEZONE).getTime();
  const todayIso = new Intl.DateTimeFormat('en-CA', {
    timeZone: EVENT_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
  const startOfToday = new TZDate(`${todayIso}T00:00:00`, EVENT_TIMEZONE).getTime();
  return Math.round((startOfEventDay - startOfToday) / 86_400_000);
}

/** "בעוד 12 ימים" / "היום" / "עבר". Hebrew inflects for one and two, so a bare plural is wrong twice. */
export function describeTimeUntilEvent(isoDate: string | null, now: Date = new Date()): string {
  const days = daysUntilEvent(isoDate, now);
  if (days === null) return '';
  if (days < 0) return 'האירוע עבר';
  if (days === 0) return 'היום';
  if (days === 1) return 'מחר';
  if (days === 2) return 'מחרתיים';
  return `בעוד ${days} ימים`;
}
