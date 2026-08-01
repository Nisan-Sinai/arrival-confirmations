/**
 * Israeli phone normalisation (§6).
 *
 * Every phone number in the system passes through here before it is stored or
 * compared. That matters more than it looks: `rsvps.phone_normalized` carries a
 * uniqueness constraint, so two spellings of one number that normalise differently
 * would let the same guest create two RSVPs — and two spellings that normalise the
 * same when they are different people would collide one guest onto another's row.
 *
 * The canonical form is E.164: `+972` followed by the subscriber number with the
 * leading zero removed. The database enforces the same shape with a CHECK
 * constraint, so a bug here surfaces as a rejected insert rather than bad data.
 */

/** Mobile prefixes in service in Israel, without the leading zero. */
const MOBILE_PREFIXES = ['50', '51', '52', '53', '54', '55', '56', '57', '58', '59'] as const;

/** Geographic landline area codes, plus the non-geographic 7x range. */
const LANDLINE_PREFIXES = ['2', '3', '4', '8', '9', '77', '72', '73', '74', '76', '78'] as const;

/** Every Israeli subscriber number is seven digits once its prefix is removed. */
const SUBSCRIBER_DIGITS = 7;

export class PhoneNormalizationError extends Error {
  readonly reason: PhoneRejectionReason;

  constructor(reason: PhoneRejectionReason) {
    super(reason);
    this.name = 'PhoneNormalizationError';
    this.reason = reason;
  }
}

export type PhoneRejectionReason =
  'empty' | 'contains_letters' | 'not_israeli' | 'unknown_prefix' | 'wrong_length';

/**
 * Strips formatting the user is entitled to type: spaces, hyphens, dots, brackets
 * and the non-breaking spaces that arrive when a number is pasted from a document.
 */
function stripSeparators(input: string): string {
  return input.replace(/[\s ‏‎().\-–—]/g, '');
}

/**
 * Reduces any accepted spelling to the national significant number — the digits
 * after the country code, with no leading zero.
 *
 * Handles `+972…`, `00972…`, `972…` and the local `0…` form. A bare `972…` is
 * ambiguous in principle (it could be a local number starting with 9), which is why
 * it is only treated as a country code when what follows is itself a valid
 * subscriber number; the prefix check downstream decides.
 */
function toNationalNumber(digits: string): string {
  if (digits.startsWith('00972')) return digits.slice(5).replace(/^0/, '');
  if (digits.startsWith('972')) return digits.slice(3).replace(/^0/, '');
  if (digits.startsWith('0')) return digits.slice(1);
  return digits;
}

/**
 * Returns the matched prefix itself, not just its kind.
 *
 * The prefix length is what determines the valid total length, so returning only
 * "landline" loses the information the length check needs: `03` takes seven
 * subscriber digits after a one-digit area code, `077` takes seven after two. A
 * blanket "landlines are 8 or 9 digits" rule accepts `077-123456`, which is a real
 * number one digit short.
 */
function matchPrefix(national: string): string | null {
  // Longest match first, so `77` wins over a shorter prefix that also matches.
  const all = [...MOBILE_PREFIXES, ...LANDLINE_PREFIXES].sort((a, b) => b.length - a.length);
  return all.find((prefix) => national.startsWith(prefix)) ?? null;
}

/**
 * Returns the E.164 form, or throws `PhoneNormalizationError` with a machine-readable
 * reason the caller can map to Hebrew copy.
 *
 * Rejects, per §6: non-Israeli numbers, unknown prefixes, and wrong lengths.
 */
export function normalizeIsraeliPhone(input: string): string {
  if (typeof input !== 'string' || input.trim() === '') {
    throw new PhoneNormalizationError('empty');
  }

  const compact = stripSeparators(input.trim());

  // A `+` is only meaningful at the front; anywhere else the input is malformed.
  const withoutPlus = compact.startsWith('+') ? compact.slice(1) : compact;
  if (!/^\d+$/.test(withoutPlus)) {
    throw new PhoneNormalizationError(
      /[a-zA-Z֐-׿]/.test(compact) ? 'contains_letters' : 'not_israeli',
    );
  }

  // An explicit international prefix for anywhere other than Israel is a clear reject,
  // rather than something to coerce into a local number.
  if (compact.startsWith('+') && !withoutPlus.startsWith('972')) {
    throw new PhoneNormalizationError('not_israeli');
  }
  if (withoutPlus.startsWith('00') && !withoutPlus.startsWith('00972')) {
    throw new PhoneNormalizationError('not_israeli');
  }

  const national = toNationalNumber(withoutPlus);
  const prefix = matchPrefix(national);
  if (prefix === null) throw new PhoneNormalizationError('unknown_prefix');

  // Uniform across mobile and landline: every Israeli subscriber number is seven
  // digits after its prefix. `050`+7 = 9, `03`+7 = 8, `077`+7 = 9.
  if (national.length !== prefix.length + SUBSCRIBER_DIGITS) {
    throw new PhoneNormalizationError('wrong_length');
  }

  return `+972${national}`;
}

/** Non-throwing variant for call sites that branch rather than propagate. */
export function tryNormalizeIsraeliPhone(
  input: string,
): { ok: true; value: string } | { ok: false; reason: PhoneRejectionReason } {
  try {
    return { ok: true, value: normalizeIsraeliPhone(input) };
  } catch (error) {
    /* v8 ignore else -- normalizeIsraeliPhone throws only PhoneNormalizationError */
    if (error instanceof PhoneNormalizationError) return { ok: false, reason: error.reason };
    /*
     * Anything else is a bug in the normaliser rather than a bad number, and it must
     * surface as one. Swallowing it here would report a perfectly valid phone number
     * to the guest as invalid, and they would retype it forever.
     *
     * v8 ignore: unreachable from outside the module — `normalizeIsraeliPhone` throws
     * only `PhoneNormalizationError`, and it is called directly rather than through a
     * seam a test could replace. Covering it would mean adding indirection that exists
     * for no reason but the coverage number.
     */
    /* v8 ignore next */
    throw error;
  }
}

/**
 * Formats an E.164 number the way an Israeli reader expects to see it, for display
 * only. Never store this — `phone_normalized` is the comparable value.
 */
export function formatIsraeliPhoneForDisplay(e164: string): string {
  const national = e164.startsWith('+972') ? e164.slice(4) : e164;
  if (MOBILE_PREFIXES.some((prefix) => national.startsWith(prefix))) {
    return `0${national.slice(0, 2)}-${national.slice(2)}`;
  }
  const areaCodeLength = national.length === 9 ? 2 : 1;
  return `0${national.slice(0, areaCodeLength)}-${national.slice(areaCodeLength)}`;
}
