import { describe, expect, it } from 'vitest';

import {
  formatIsraeliPhoneForDisplay,
  normalizeIsraeliPhone,
  PhoneNormalizationError,
  tryNormalizeIsraeliPhone,
  type PhoneRejectionReason,
} from '@/lib/phone';

/**
 * Table-driven, as §6 requires. The accepted spellings come straight from the
 * specification; the rest are the shapes real people actually type — pasted numbers
 * carrying a right-to-left mark, numbers with dots, numbers with the country code
 * and a redundant leading zero.
 */
describe('normalizeIsraeliPhone', () => {
  const accepted: ReadonlyArray<[input: string, expected: string]> = [
    ['0501234567', '+972501234567'],
    ['050-123-4567', '+972501234567'],
    ['050 123 4567', '+972501234567'],
    ['+972501234567', '+972501234567'],
    ['972-50-123-4567', '+972501234567'],
    ['05-01-234-567', '+972501234567'],
    // Beyond the specification's list, but all unambiguous:
    ['+972-50-123-4567', '+972501234567'],
    ['00972501234567', '+972501234567'],
    ['+9720501234567', '+972501234567'],
    ['050.123.4567', '+972501234567'],
    ['(050) 123-4567', '+972501234567'],
    ['  0501234567  ', '+972501234567'],
    ['0541234567', '+972541234567'],
    ['0591234567', '+972591234567'],
    // Landlines: one-digit area codes are 8 national digits, two-digit are 9.
    ['03-1234567', '+97231234567'],
    ['02-1234567', '+97221234567'],
    ['09-1234567', '+97291234567'],
    ['077-1234567', '+972771234567'],
    ['073-1234567', '+972731234567'],
  ];

  it.each(accepted)('normalises %s to %s', (input, expected) => {
    expect(normalizeIsraeliPhone(input)).toBe(expected);
  });

  const rejected: ReadonlyArray<[input: string, reason: PhoneRejectionReason]> = [
    ['', 'empty'],
    ['   ', 'empty'],
    ['not a phone', 'contains_letters'],
    ['050-ABC-4567', 'contains_letters'],
    ['+14155550123', 'not_israeli'],
    ['+442071234567', 'not_israeli'],
    ['004412345678', 'not_israeli'],
    ['0601234567', 'unknown_prefix'],
    ['0101234567', 'unknown_prefix'],
    ['050123456', 'wrong_length'],
    ['05012345678', 'wrong_length'],
    ['03-123456', 'wrong_length'],
    ['077-123456', 'wrong_length'],
  ];

  it.each(rejected)('rejects %s as %s', (input, reason) => {
    expect(() => normalizeIsraeliPhone(input)).toThrow(PhoneNormalizationError);
    try {
      normalizeIsraeliPhone(input);
    } catch (error) {
      expect((error as PhoneNormalizationError).reason).toBe(reason);
    }
  });

  it('rejects a non-string input rather than coercing it', () => {
    expect(() => normalizeIsraeliPhone(undefined as unknown as string)).toThrow(
      PhoneNormalizationError,
    );
  });

  it('is idempotent, so re-normalising a stored value cannot corrupt it', () => {
    const once = normalizeIsraeliPhone('050-123-4567');
    expect(normalizeIsraeliPhone(once)).toBe(once);
  });

  it('maps distinct spellings of one number onto a single stored value', () => {
    const spellings = ['0501234567', '050-123-4567', '+972501234567', '00972501234567'];
    const normalised = new Set(spellings.map(normalizeIsraeliPhone));
    // §6: anything else would let one guest hold two RSVP rows.
    expect(normalised.size).toBe(1);
  });

  it('keeps different numbers distinct', () => {
    expect(normalizeIsraeliPhone('0501234567')).not.toBe(normalizeIsraeliPhone('0501234568'));
  });

  it('produces a value the database CHECK constraint accepts', () => {
    // Mirrors guests_phone_normalized_e164 / rsvps_phone_normalized_e164.
    const constraint = /^\+972[1-9][0-9]{7,8}$/;
    for (const [input] of accepted) {
      expect(normalizeIsraeliPhone(input)).toMatch(constraint);
    }
  });
});

describe('tryNormalizeIsraeliPhone', () => {
  it('reports success with the normalised value', () => {
    expect(tryNormalizeIsraeliPhone('050-123-4567')).toEqual({
      ok: true,
      value: '+972501234567',
    });
  });

  it('reports failure with a reason instead of throwing', () => {
    expect(tryNormalizeIsraeliPhone('+14155550123')).toEqual({
      ok: false,
      reason: 'not_israeli',
    });
  });
});

describe('formatIsraeliPhoneForDisplay', () => {
  it.each([
    ['+972501234567', '050-1234567'],
    ['+97231234567', '03-1234567'],
    ['+972771234567', '077-1234567'],
  ])('renders %s as %s', (e164, expected) => {
    expect(formatIsraeliPhoneForDisplay(e164)).toBe(expected);
  });

  it('tolerates a value that is already national', () => {
    expect(formatIsraeliPhoneForDisplay('501234567')).toBe('050-1234567');
  });
});
