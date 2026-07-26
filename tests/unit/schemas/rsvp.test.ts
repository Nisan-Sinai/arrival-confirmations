import { describe, expect, it } from 'vitest';

import { UI_MESSAGES } from '@/config/messages';
import { parseRsvpSubmission, toFieldErrors } from '@/schemas/rsvp';

/** A submission that should always pass, so each test varies exactly one thing. */
const validSubmission = () => ({
  fullName: 'ישראל ישראלי',
  phone: '050-123-4567',
  attendanceStatus: 'attending' as const,
  adultsCount: 2,
  childrenCount: 1,
  babiesCount: 0,
  familySide: 'side_a' as const,
  dietaryRequirements: null,
  notes: null,
  consent: true as const,
  company: '',
});

const parseWith = (overrides: Record<string, unknown>) =>
  parseRsvpSubmission({ ...validSubmission(), ...overrides });

describe('rsvpSubmissionSchema', () => {
  it('accepts a well-formed submission', () => {
    const result = parseRsvpSubmission(validSubmission());
    expect(result.success).toBe(true);
  });

  it('stores the phone in canonical E.164, whatever was typed', () => {
    for (const spelling of ['0501234567', '050-123-4567', '+972501234567']) {
      const result = parseWith({ phone: spelling });
      expect(result.success && result.data.phone).toBe('+972501234567');
    }
  });

  it('collapses whitespace in the name so one guest is not two rows', () => {
    const result = parseWith({ fullName: '  ישראל   ישראלי  ' });
    expect(result.success && result.data.fullName).toBe('ישראל ישראלי');
  });

  it('strips bidi overrides, which could reorder text around the name', () => {
    const result = parseWith({ fullName: 'ישראל‮ישראלי' });
    expect(result.success && result.data.fullName).toBe('ישראלישראלי');
  });

  it('rejects an unticked consent box rather than storing the data anyway', () => {
    const result = parseWith({ consent: false });
    expect(result.success).toBe(false);
    expect(result.success === false && toFieldErrors(result.error)['consent']).toBe(
      UI_MESSAGES.validation.consentRequired,
    );
  });

  it('rejects a filled honeypot', () => {
    // A real guest never sees the field, so any value means a script filled it.
    expect(parseWith({ company: 'Acme Ltd' }).success).toBe(false);
  });

  it('accepts an absent honeypot, since the field is optional in the payload', () => {
    expect(parseWith({ company: undefined }).success).toBe(true);
  });

  it.each([
    ['a non-Israeli number', { phone: '+14155550123' }, 'phone'],
    ['a negative count', { adultsCount: -1 }, 'adultsCount'],
    ['an absurd count', { adultsCount: 500 }, 'adultsCount'],
    ['a fractional count', { adultsCount: 1.5 }, 'adultsCount'],
    ['a one-character name', { fullName: 'א' }, 'fullName'],
    ['an over-long name', { fullName: 'א'.repeat(200) }, 'fullName'],
    ['an unknown attendance status', { attendanceStatus: 'perhaps' }, 'attendanceStatus'],
    ['an over-long note', { notes: 'x'.repeat(1200) }, 'notes'],
    ['over-long dietary text', { dietaryRequirements: 'x'.repeat(600) }, 'dietaryRequirements'],
  ])('rejects %s', (_label, overrides, expectedField) => {
    const result = parseWith(overrides);
    expect(result.success).toBe(false);
    expect(result.success === false && Object.keys(toFieldErrors(result.error))).toContain(
      expectedField,
    );
  });

  it('rejects a declined RSVP that still books seats', () => {
    // Mirrors the rsvps_not_attending_has_no_seats CHECK constraint.
    const result = parseWith({ attendanceStatus: 'not_attending', adultsCount: 2 });
    expect(result.success).toBe(false);
  });

  it('accepts a declined RSVP with no seats', () => {
    const result = parseWith({
      attendanceStatus: 'not_attending',
      adultsCount: 0,
      childrenCount: 0,
      babiesCount: 0,
    });
    expect(result.success).toBe(true);
  });

  it('treats an empty count field as zero, not as an error', () => {
    const result = parseWith({ adultsCount: '', childrenCount: '3' });
    expect(result.success && result.data.adultsCount).toBe(0);
    expect(result.success && result.data.childrenCount).toBe(3);
  });

  it('normalises blank optional text to null rather than an empty string', () => {
    const result = parseWith({ notes: '   ', dietaryRequirements: '', familySide: '' });
    expect(result.success && result.data.notes).toBeNull();
    expect(result.success && result.data.dietaryRequirements).toBeNull();
    expect(result.success && result.data.familySide).toBeNull();
  });

  it('rejects a payload that is not an object at all', () => {
    expect(parseRsvpSubmission(null).success).toBe(false);
    expect(parseRsvpSubmission('nope').success).toBe(false);
  });

  it('produces every count bound the database also enforces', () => {
    // 30 is appConfig.maxAttendeesPerCategory and the CHECK constraint bound.
    expect(parseWith({ adultsCount: 30 }).success).toBe(true);
    expect(parseWith({ adultsCount: 31 }).success).toBe(false);
  });
});

describe('toFieldErrors', () => {
  it('maps each field to its first message', () => {
    const result = parseWith({ fullName: 'א', phone: 'nope' });
    expect(result.success).toBe(false);
    if (result.success) return;
    const errors = toFieldErrors(result.error);
    expect(errors['fullName']).toBe(UI_MESSAGES.validation.fullNameTooShort);
    expect(errors['phone']).toBe(UI_MESSAGES.validation.phoneInvalid);
  });

  it('files a form-level issue under _form', () => {
    const result = parseRsvpSubmission('not an object');
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(Object.keys(toFieldErrors(result.error))).toContain('_form');
  });
});
