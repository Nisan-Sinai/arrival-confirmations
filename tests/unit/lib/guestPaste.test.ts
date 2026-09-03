import { describe, expect, it } from 'vitest';

import { GuestImportError } from '@/lib/guestImport';
import { parsePastedGuests, toImportedGuest } from '@/lib/guestPaste';

/**
 * A guest list pasted as ordinary text.
 *
 * The cases here are the shapes a real list arrives in. An Israeli host holds their guest
 * list as a WhatsApp message or a note, not as a spreadsheet, and every format below is
 * one a person would plausibly type without thinking about it.
 */
describe('parsePastedGuests', () => {
  it('reads a name and a number in either order', () => {
    const { guests } = parsePastedGuests('דוד כהן 0501234567\n0529876543 שרה לוי');

    expect(guests).toEqual([
      { fullName: 'דוד כהן', phone: '+972501234567' },
      { fullName: 'שרה לוי', phone: '+972529876543' },
    ]);
  });

  it('accepts however the typist punctuated the number', () => {
    const { guests } = parsePastedGuests(
      [
        'א 050-123-4567',
        'ב 052 987 6543',
        'ג 053.111.2222',
        'ד +972541112233',
        'ה 972-55-4443322',
      ].join('\n'),
    );

    expect(guests.map((g) => g.phone)).toEqual([
      '+972501234567',
      '+972529876543',
      '+972531112222',
      '+972541112233',
      '+972554443322',
    ]);
  });

  it('takes the number out of the middle of a line and leaves a clean name', () => {
    const { guests } = parsePastedGuests('יוסי ומירי, 0541112222, אברהם');

    expect(guests[0]).toEqual({
      fullName: 'יוסי ומירי, אברהם'.replace(', ', ' '),
      phone: '+972541112222',
    });
  });

  it('keeps a line with no usable number instead of failing the whole paste', () => {
    // A list of forty relatives will have one entry nobody has the number for. Rejecting
    // all forty over it sends the host back to sharing a public link, which is the thing
    // this exists to replace.
    const { guests, skipped } = parsePastedGuests('דוד כהן 0501234567\nדודה מרים\nשרה 0529876543');

    expect(guests).toHaveLength(2);
    expect(skipped).toEqual(['דודה מרים']);
  });

  it('refuses a landline, which cannot be messaged', () => {
    const { guests, skipped } = parsePastedGuests('משרד 03-1234567\nדוד 0501234567');

    expect(guests.map((g) => g.fullName)).toEqual(['דוד']);
    expect(skipped).toEqual(['משרד 03-1234567']);
  });

  it('refuses a number with extra digits rather than inventing a plausible one', () => {
    // Without a trailing boundary this matches its first ten characters and silently
    // produces a wrong number that looks entirely correct.
    const { skipped } = parsePastedGuests('דוד 0501234567890\nשרה 0529876543');

    expect(skipped).toEqual(['דוד 0501234567890']);
  });

  it('drops a bare number with nobody attached to it', () => {
    // "0501234567" as a guest name is what the host would be reading on the day.
    const { guests, skipped } = parsePastedGuests('0501234567\nדוד 0529876543');

    expect(guests.map((g) => g.fullName)).toEqual(['דוד']);
    // Skipped lines come back verbatim, exactly as the host pasted them, so they can be
    // shown for correcting rather than as something the parser has already altered.
    expect(skipped).toEqual(['0501234567']);
  });

  it('counts one person once, however they were written twice', () => {
    const { guests } = parsePastedGuests('דוד כהן 050-1234567\nדוד 0501234567');

    expect(guests).toEqual([{ fullName: 'דוד כהן', phone: '+972501234567' }]);
  });

  it('ignores blank lines and stray whitespace', () => {
    const { guests } = parsePastedGuests('\n\n   דוד 0501234567   \n\n');

    expect(guests).toEqual([{ fullName: 'דוד', phone: '+972501234567' }]);
  });

  it('refuses an empty paste', () => {
    expect(() => parsePastedGuests('   ')).toThrow(GuestImportError);
  });

  it('refuses a paste with no number anywhere in it', () => {
    expect(() => parsePastedGuests('דוד כהן\nשרה לוי')).toThrow(/לא נמצא אף מספר נייד/);
  });

  it('accepts every number shape it is willing to match', () => {
    // The contract that lets the parser call the normaliser without a guard: anything
    // MOBILE finds must be something normalizeIsraeliPhone can take. If the two ever drift
    // apart this fails here, rather than throwing in front of a host mid-paste.
    const shapes = [
      '0501234567',
      '050-123-4567',
      '050 123 4567',
      '050.123.4567',
      '+972501234567',
      '+972-50-1234567',
      '972501234567',
      '972 50 123 4567',
      '0521234567',
      '0531234567',
      '0541234567',
      '0551234567',
      '0581234567',
      '0591234567',
    ];

    for (const shape of shapes) {
      const { guests, skipped } = parsePastedGuests(`דוד ${shape}`);
      expect(skipped, shape).toEqual([]);
      expect(guests[0]?.phone, shape).toMatch(/^\+9725\d{8}$/);
    }
  });

  it('fills the remaining import fields with honest blanks', () => {
    // A pasted line supplies a name and a number. Anything else the file import carries
    // must be absent rather than guessed — a default party size of 4 would quietly inflate
    // a caterer's headcount.
    expect(toImportedGuest({ fullName: 'דוד', phone: '+972501234567' })).toEqual({
      fullName: 'דוד',
      phone: '+972501234567',
      email: null,
      familySide: null,
      partySize: 1,
      tableName: null,
      seatNumber: null,
      notes: null,
    });
  });
});
