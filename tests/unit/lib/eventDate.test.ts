import { describe, expect, it } from 'vitest';

import {
  daysUntilEvent,
  describeTimeUntilEvent,
  eventZoneInstant,
  formatEventDate,
  formatEventWeekday,
  formatHebrewDate,
} from '@/lib/eventDate';

/**
 * Date presentation for the host surface.
 *
 * The regression these cover: the dashboard printed `event_date` exactly as Postgres
 * returned it — `2026-09-04` — on a Hebrew right-to-left page, while the guest-facing
 * invitation rendered the same value as a weekday plus a Hebrew date.
 *
 * Every case is asserted against Asia/Jerusalem regardless of where the test runs
 * (§5), which is the part most likely to rot: a developer in a different zone must get
 * the same answers as CI.
 */
describe('formatEventDate', () => {
  it('renders an ISO date in Israeli day.month.year order', () => {
    expect(formatEventDate('2026-09-04')).toBe('4.9.2026');
  });

  it('returns a dash rather than "Invalid Date" for a missing date', () => {
    expect(formatEventDate(null)).toBe('—');
    expect(formatEventDate('')).toBe('—');
  });
});

describe('formatEventWeekday', () => {
  it('names the Hebrew weekday', () => {
    // 2026-09-04 is a Friday.
    expect(formatEventWeekday('2026-09-04')).toBe('שישי');
    // 2026-09-05 is a Saturday.
    expect(formatEventWeekday('2026-09-05')).toBe('שבת');
  });

  it('is empty rather than wrong when there is no date', () => {
    expect(formatEventWeekday(null)).toBe('');
  });
});

describe('formatHebrewDate', () => {
  it('renders the Hebrew calendar date in gematriya', () => {
    // Hebrew letters and a geresh/gershayim, not digits — the specific value depends
    // on @hebcal's tables, so the assertion is on the shape rather than the string.
    const rendered = formatHebrewDate('2026-09-04');
    expect(rendered).toMatch(/[֐-׿]/);
    expect(rendered).not.toMatch(/\d/);
  });

  it('is empty for a missing or malformed date rather than throwing', () => {
    expect(formatHebrewDate(null)).toBe('');
    expect(formatHebrewDate('')).toBe('');
  });
});

describe('daysUntilEvent', () => {
  /**
   * Both ends are floored to midnight in the event's zone before subtracting. The bug
   * this prevents: comparing raw instants makes an event at 19:00 tonight read as
   * "0 days" only until 19:00, then flip to a negative — so a host refreshing during
   * their own party is told it is over.
   */
  it('counts whole days, not elapsed hours', () => {
    // Late evening in Jerusalem on the 3rd; the event is the following morning.
    const now = new Date('2026-09-03T20:30:00+03:00');
    expect(daysUntilEvent('2026-09-04', now)).toBe(1);
  });

  it('still reads as today once the event has started', () => {
    const now = new Date('2026-09-04T21:00:00+03:00');
    expect(daysUntilEvent('2026-09-04', now)).toBe(0);
  });

  it('goes negative only after the day itself has passed', () => {
    const now = new Date('2026-09-05T00:30:00+03:00');
    expect(daysUntilEvent('2026-09-04', now)).toBe(-1);
  });

  it('resolves in Asia/Jerusalem, not in the viewer’s zone', () => {
    // 22:00 UTC on the 3rd is already 01:00 on the 4th in Jerusalem, so a host
    // checking from London on the evening of the 3rd must be told "today".
    const now = new Date('2026-09-03T22:00:00Z');
    expect(daysUntilEvent('2026-09-04', now)).toBe(0);
  });

  it('has no answer without a date', () => {
    expect(daysUntilEvent(null)).toBeNull();
  });
});

describe('describeTimeUntilEvent', () => {
  const now = new Date('2026-09-01T09:00:00+03:00');

  it('uses the Hebrew singular and dual rather than a bare plural', () => {
    expect(describeTimeUntilEvent('2026-09-02', now)).toBe('מחר');
    expect(describeTimeUntilEvent('2026-09-03', now)).toBe('מחרתיים');
  });

  it('counts plainly beyond two days', () => {
    expect(describeTimeUntilEvent('2026-09-13', now)).toBe('בעוד 12 ימים');
  });

  it('says today on the day', () => {
    expect(describeTimeUntilEvent('2026-09-01', now)).toBe('היום');
  });

  it('says the event has passed rather than counting backwards', () => {
    expect(describeTimeUntilEvent('2026-08-30', now)).toBe('האירוע עבר');
  });

  it('is empty without a date', () => {
    expect(describeTimeUntilEvent(null, now)).toBe('');
  });
});

/**
 * The countdown bug.
 *
 * `new TZDate('2026-12-15T19:30:00', 'Asia/Jerusalem')` parses its string in the
 * server's zone and only *displays* in Jerusalem. On a UTC server — which is every
 * server this runs on, and this test runner — a 19:30 ceremony resolved to 19:30 UTC, so
 * every invitation counted down to a moment two or three hours after the event began.
 *
 * Each expectation below is an absolute instant, so it holds on a machine in any zone:
 * the numeric constructor does not consult the system clock's offset at all.
 */
describe('eventZoneInstant', () => {
  it('resolves a winter evening against +02:00', () => {
    expect(eventZoneInstant('2026-12-15', '19:30:00')).toBe(Date.UTC(2026, 11, 15, 17, 30));
  });

  it('resolves a summer evening against +03:00', () => {
    expect(eventZoneInstant('2026-08-15', '19:30:00')).toBe(Date.UTC(2026, 7, 15, 16, 30));
  });

  it('defaults to midnight in the event zone, which is the previous evening in UTC', () => {
    expect(eventZoneInstant('2026-12-15')).toBe(Date.UTC(2026, 11, 14, 22, 0));
    expect(eventZoneInstant('2026-08-15')).toBe(Date.UTC(2026, 7, 14, 21, 0));
  });

  it('accepts a time without seconds and keeps the seconds it is given', () => {
    expect(eventZoneInstant('2026-12-15', '08:05')).toBe(Date.UTC(2026, 11, 15, 6, 5));
    expect(eventZoneInstant('2026-12-15', '08:05:30')).toBe(Date.UTC(2026, 11, 15, 6, 5, 30));
    // Postgres can return fractional seconds; the fraction is dropped, not rounded up.
    expect(eventZoneInstant('2026-12-15', '08:05:30.9')).toBe(Date.UTC(2026, 11, 15, 6, 5, 30));
  });

  it('gives the same calendar day back when formatted in the event zone', () => {
    // The first and last minutes of a day, either side of the clock change.
    for (const date of ['2026-03-27', '2026-10-25', '2026-01-01', '2026-06-30']) {
      const format = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Jerusalem',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      });
      expect(format.format(eventZoneInstant(date)), date).toBe(date);
      expect(format.format(eventZoneInstant(date, '23:59:59')), date).toBe(date);
    }
  });
});
