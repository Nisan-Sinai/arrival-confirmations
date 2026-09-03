import 'server-only';

import { GuestImportError, type ImportedGuest } from '@/lib/guestImport';
import { normalizeIsraeliPhone } from '@/lib/phone';

/**
 * A guest list pasted as ordinary text.
 *
 * The spreadsheet import wants a header row naming a name column and a phone column.
 * Production says that is the wrong shape of question. The one real event this product
 * has had — a brit mila, created three days before the day — took six replies through the
 * public form against a single guest row, which means no list was ever imported and no
 * personal link was ever sent. The host shared one link instead, and every feature built
 * on knowing who was invited went unused: you cannot chase who has not replied when the
 * system was never told who was asked.
 *
 * The reason is friction, and it is worth being precise about it. An Israeli host does not
 * hold their guest list as a spreadsheet. They hold it as text — a WhatsApp message to a
 * sibling, a note on their phone, a list typed at a kitchen table. Asking them to build a
 * two-column file with the right headers, days before a simcha, loses to sharing one link
 * every time.
 *
 * So this takes the text as it comes:
 *
 *     דוד כהן 050-123-4567
 *     0529876543  שרה לוי
 *     יוסי ומירי אברהם, 054 111 2222
 *
 * **The phone is what is found; the name is whatever is left.** Israeli mobile numbers
 * have a shape distinctive enough to locate anywhere in a line, and once it is removed
 * the remainder is a name by definition. Trying it the other way — parse a name, hope a
 * phone follows — fails on the very common "number first" habit and on any name
 * containing a digit.
 */

/**
 * A mobile number sitting anywhere in a line.
 *
 * Israeli mobiles are `05x` followed by seven digits, with spaces, hyphens or dots
 * scattered through them at the typist's whim, and often a `+972` or `972` prefix with the
 * leading zero dropped. Landlines are deliberately not matched: a guest list is a list of
 * people to message, and a message to a landline reaches nobody.
 *
 * The trailing boundary matters. Without it `0501234567890` — a mistyped number with
 * three extra digits — would match its first ten characters and silently invent a
 * plausible wrong number, which is worse than refusing the line.
 */
const MOBILE = /(?<![\d֐-׿])((?:\+?972[-. ]?|0)5\d(?:[-. ]?\d){7})(?![\d])/u;

/**
 * Whatever separated the fields, once the number is lifted out from between them.
 *
 * Taking the number out of the middle of `יוסי ומירי, 0541112222, אברהם` leaves two commas
 * with nothing between them, and a guest called `יוסי ומירי, , אברהם` is what the host
 * would then be reading on the day. Splitting on punctuation and rejoining the surviving
 * fragments with a single space handles the middle and the edges in one pass.
 */
const SEPARATORS = /[\s,;:|/\\]+|(?:^|\s)[-–—.]+(?=\s|$)/gu;

export interface PastedGuest {
  readonly fullName: string;
  readonly phone: string;
}

export interface GuestPasteResult {
  readonly guests: readonly PastedGuest[];
  /**
   * Lines that held a name but no usable number, kept verbatim.
   *
   * Reported rather than dropped, and rather than failing the whole paste. A list of forty
   * relatives will have one entry someone never got the number for, and rejecting all
   * forty over it sends the host back to the public-link shortcut this exists to replace.
   */
  readonly skipped: readonly string[];
}

/**
 * Everything the file import would have produced, for a row that carries only the two
 * fields a pasted line can honestly supply.
 */
export function toImportedGuest(guest: PastedGuest): ImportedGuest {
  return {
    fullName: guest.fullName,
    phone: guest.phone,
    email: null,
    familySide: null,
    partySize: 1,
    tableName: null,
    seatNumber: null,
    notes: null,
  };
}

export function parsePastedGuests(input: string): GuestPasteResult {
  if (input.trim() === '') {
    throw new GuestImportError('לא הודבקה רשימה.');
  }

  const guests: PastedGuest[] = [];
  const skipped: string[] = [];
  // Normalised so a number pasted once as 050-1234567 and once as +972501234567 is one
  // guest, not two. The file import dedupes the same way further down the pipeline; doing
  // it here as well means the count shown back to the host is the count that lands.
  const seen = new Set<string>();

  for (const rawLine of input.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (line === '') continue;

    const match = MOBILE.exec(line);
    if (match === null) {
      skipped.push(line);
      continue;
    }

    // No guard around this, and that is a deliberate contract rather than an oversight:
    // every shape `MOBILE` matches is a shape `normalizeIsraeliPhone` accepts. A try/catch
    // here would be unreachable defensive code — untestable, and therefore unable to tell
    // anyone when it stopped being true. The invariant is asserted directly in the tests
    // instead, so the two definitions drifting apart fails loudly at build time rather
    // than quietly at a guest's expense.
    const phone = normalizeIsraeliPhone(match[1]!);

    const fullName = line
      .replace(match[1]!, ' ')
      .split(SEPARATORS)
      .filter((part) => part !== '')
      .join(' ');

    if (fullName === '') {
      // A bare number with nobody attached. Kept out rather than invented a name for,
      // because "0501234567" as a guest name is what the host would see on the day.
      skipped.push(line);
      continue;
    }

    if (seen.has(phone)) continue;
    seen.add(phone);
    guests.push({ fullName, phone });
  }

  if (guests.length === 0) {
    throw new GuestImportError('לא נמצא אף מספר נייד ברשימה שהודבקה.');
  }

  return { guests, skipped };
}
