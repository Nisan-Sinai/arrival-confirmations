import { describe, expect, it } from 'vitest';

import { formatEventWeekday, formatHebrewDate } from '@/lib/eventDate';
import { tryNormalizeIsraeliPhone } from '@/lib/phone';
import { resolveClientIpHash } from '@/lib/server/ip';
import { coercedCountSchema } from '@/schemas/rsvp';

/**
 * The branches every other suite walks past.
 *
 * Each of these is a defensive path that a normal input never reaches, which is
 * precisely why none of them had a test: they only run when something upstream is
 * already wrong, and that is the moment you least want to discover the handler is
 * itself broken.
 */

describe('formatHebrewDate with a malformed date', () => {
  /**
   * `event_date` is a Postgres `date` and cannot be malformed in practice. It can be
   * malformed in a fixture, in a hand-written seed, or after a column type change —
   * and the guest-facing invitation must render an empty string rather than throw a
   * RangeError that takes the whole page down with it.
   */
  it('returns an empty string rather than throwing', () => {
    expect(formatHebrewDate('not-a-date')).toBe('');
    expect(formatHebrewDate('2026')).toBe('');
    expect(formatHebrewDate('2026-09')).toBe('');
  });

  it('is empty for a weekday it cannot resolve', () => {
    expect(formatEventWeekday('')).toBe('');
    expect(formatEventWeekday(null)).toBe('');
  });

  /**
   * Shaped like a date and still not one. These pass the `\d{4}-\d{2}-\d{2}` test, so
   * only the range check stops them — and `new Date(2026, 12, 45)` does not throw, it
   * rolls silently into the following year, which would print a confident wrong date
   * on an invitation rather than an obvious blank.
   */
  it('rejects a well-shaped date with an impossible month or day', () => {
    expect(formatHebrewDate('2026-13-04')).toBe('');
    expect(formatHebrewDate('2026-00-04')).toBe('');
    expect(formatHebrewDate('2026-09-45')).toBe('');
    expect(formatHebrewDate('2026-09-00')).toBe('');
    expect(formatEventWeekday('2026-13-04')).toBe('');
  });
});

describe('phone input that is not digits at all', () => {
  /**
   * The two rejection reasons are distinguished because they mean different things to
   * a guest: letters in the field is a typo they can see, while a well-formed foreign
   * number is a rule they cannot. Collapsing them would make one of the two messages
   * wrong every time.
   */
  it('reports letters separately from a number that is merely not Israeli', () => {
    expect(tryNormalizeIsraeliPhone('call me maybe')).toEqual({
      ok: false,
      reason: 'contains_letters',
    });
    expect(tryNormalizeIsraeliPhone('אין לי טלפון')).toEqual({
      ok: false,
      reason: 'contains_letters',
    });
    // Punctuation only — no letters to point at, so it is simply not a number here.
    expect(tryNormalizeIsraeliPhone('+++').ok).toBe(false);
    expect(tryNormalizeIsraeliPhone('05!!1234567')).toEqual({
      ok: false,
      reason: 'not_israeli',
    });
  });
});

describe('coercedCountSchema with unparseable input', () => {
  /**
   * A number input hands back a string. An empty field is zero, a numeric string is
   * that number — and anything else must fail validation with the Hebrew message
   * rather than being coerced into NaN and stored.
   */
  it('treats an empty field as zero', () => {
    expect(coercedCountSchema.parse('')).toBe(0);
    expect(coercedCountSchema.parse(null)).toBe(0);
    expect(coercedCountSchema.parse(undefined)).toBe(0);
  });

  it('parses a numeric string', () => {
    expect(coercedCountSchema.parse('3')).toBe(3);
    expect(coercedCountSchema.parse(' 4 ')).toBe(4);
  });

  it('rejects text rather than storing NaN', () => {
    // The preprocess step hands the original string through when Number() gives NaN,
    // so the schema rejects a *string* and reports the count message — rather than
    // accepting a NaN that would reach the database as null.
    expect(coercedCountSchema.safeParse('שלושה').success).toBe(false);
    expect(coercedCountSchema.safeParse('12abc').success).toBe(false);
  });

  it('still enforces the bounds after coercion', () => {
    expect(coercedCountSchema.safeParse('-1').success).toBe(false);
    expect(coercedCountSchema.safeParse('31').success).toBe(false);
    expect(coercedCountSchema.safeParse('2.5').success).toBe(false);
  });
});

describe('toNationalNumber via the public normaliser', () => {
  /**
   * The branch for digits that carry neither a country code nor a national trunk
   * prefix. It is what a guest produces by typing their number without the leading
   * zero, which happens often enough on a phone keypad to matter.
   */
  it('accepts a subscriber number typed without its leading zero', () => {
    expect(tryNormalizeIsraeliPhone('501234567')).toEqual({ ok: true, value: '+972501234567' });
  });

  it('accepts every accepted spelling of the same number', () => {
    for (const spelling of [
      '0501234567',
      '050-123-4567',
      '050 1234567',
      '+972501234567',
      '00972501234567',
      '972501234567',
      '972-50-1234567',
    ]) {
      expect(tryNormalizeIsraeliPhone(spelling)).toEqual({ ok: true, value: '+972501234567' });
    }
  });

  it('still rejects a number that is not Israeli', () => {
    expect(tryNormalizeIsraeliPhone('+14155550123').ok).toBe(false);
  });
});

describe('resolveClientIpHash with a malformed forwarded address', () => {
  const withHeaders = (values: Record<string, string>) => new Headers(values);

  /**
   * An unterminated bracket is not a repairable IPv6 address. The normaliser leaves it
   * alone so validation rejects it, rather than guessing at a prefix and hashing
   * something that was never an address — which would put a junk bucket key into the
   * rate limiter and let the request through unmetered.
   */
  it('does not repair an unterminated IPv6 bracket into a plausible address', () => {
    const result = resolveClientIpHash(withHeaders({ 'x-forwarded-for': '[::1' }));
    expect(result.trusted).toBe(false);
  });

  it('accepts a properly bracketed IPv6 with a port', () => {
    const result = resolveClientIpHash(withHeaders({ 'x-forwarded-for': '[2001:db8::1]:443' }));
    expect(result.trusted).toBe(true);
    expect(result.hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('falls back to a stable hash when no address can be resolved at all', () => {
    const first = resolveClientIpHash(withHeaders({}));
    const second = resolveClientIpHash(withHeaders({}));
    expect(first.trusted).toBe(false);
    // Stable, so an unresolvable client still lands in one bucket rather than a new
    // one per request — otherwise the rate limit is trivially bypassed by hiding.
    expect(first.hash).toBe(second.hash);
  });
});
