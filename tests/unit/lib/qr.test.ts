import { createHash } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import {
  encodeQr,
  QR_MAX_BYTES,
  QR_QUIET_ZONE,
  qrSvgPath,
  qrViewBoxSize,
  type QrCode,
} from '@/lib/qr';

/**
 * The QR encoder behind the printable invitation code.
 *
 * A unit test cannot scan a code, so the question "does a phone read this?" was answered
 * once, outside the suite: every symbol below — and forty more, covering each version from
 * 1 to 10 at its exact capacity — was rendered to an image and decoded with zxing-cpp, an
 * independent implementation, and each returned its original text byte for byte. The
 * golden matrix and digests here pin that verified output, so a change that alters a
 * single module fails loudly; the structural tests explain *which* rule broke.
 */

const rowsOf = (qr: QrCode): string[] =>
  qr.modules.map((row) => row.map((dark) => (dark ? '#' : '.')).join(''));

const digest = (qr: QrCode): string =>
  createHash('sha256').update(rowsOf(qr).join('\n')).digest('hex');

const INVITE_URL = 'https://arrival-confirmations.vercel.app/e/Xy7_k2Lm9QpRs4Tv';

/** The largest byte payload each version holds at level M. */
const CAPACITY = [14, 26, 42, 62, 84, 106, 122, 152, 180, 213] as const;

/** Reads the 15 format bits from the strip beside the top-left finder. */
function readFormatBits(qr: QrCode): number {
  const at = (x: number, y: number) => (qr.modules[y]![x] ? 1 : 0);
  let bits = 0;
  for (let i = 0; i <= 5; i++) bits |= at(8, i) << i;
  bits |= at(8, 7) << 6;
  bits |= at(8, 8) << 7;
  bits |= at(7, 8) << 8;
  for (let i = 9; i < 15; i++) bits |= at(14 - i, 8) << i;
  return bits;
}

/** The same 15 bits from the second copy, split between the other two finders. */
function readFormatBitsCopy(qr: QrCode): number {
  const at = (x: number, y: number) => (qr.modules[y]![x] ? 1 : 0);
  let bits = 0;
  for (let i = 0; i < 8; i++) bits |= at(qr.size - 1 - i, 8) << i;
  for (let i = 8; i < 15; i++) bits |= at(8, qr.size - 15 + i) << i;
  return bits;
}

/** Remainder of a polynomial division over GF(2); zero means a valid BCH codeword. */
function bchRemainder(value: number, generator: number, generatorBits: number): number {
  let remainder = value;
  for (let shift = 31 - generatorBits; shift >= 0; shift--) {
    if ((remainder >>> (shift + generatorBits - 1)) & 1) remainder ^= generator << shift;
  }
  return remainder;
}

describe('encodeQr', () => {
  it('matches the verified version-1 symbol module for module', () => {
    const qr = encodeQr('A');
    expect(qr.version).toBe(1);
    expect(qr.size).toBe(21);
    expect(rowsOf(qr)).toEqual([
      '#######.#..#..#######',
      '#.....#.#####.#.....#',
      '#.###.#...#.#.#.###.#',
      '#.###.#.##.##.#.###.#',
      '#.###.#..###..#.###.#',
      '#.....#..#.##.#.....#',
      '#######.#.#.#.#######',
      '........##.##........',
      '#.##.###..###.#..#.##',
      '.#.##..#.#.####..#...',
      '##..###.##.#.....##.#',
      '#.##.#.....#..#####..',
      '#..####..#..#..#..#..',
      '........#.##..#..#..#',
      '#######.#..##..#.#...',
      '#.....#.##.....##.##.',
      '#.###.#..##.#####...#',
      '#.###.#.####..######.',
      '#.###.#.#.#.#.##.....',
      '#.....#...#..#.#..#.#',
      '#######.#....#..#....',
    ]);
  });

  it('pins the verified symbols for an invitation link, Hebrew text and a full code', () => {
    const invite = encodeQr(INVITE_URL);
    expect([invite.version, invite.size]).toEqual([4, 33]);
    expect(digest(invite)).toBe('4dde386f31da08325bc8bc8605af7f8c8037caee5ca49f60fbe50aef360f34e9');

    // Multi-byte UTF-8: the count field holds bytes, not characters.
    const hebrew = encodeQr('שלום עולם — הזמנה לחתונה');
    expect([hebrew.version, hebrew.size]).toEqual([4, 33]);
    expect(digest(hebrew)).toBe('555a64247826752faa098c1b21b5672f6ba5f7a447152d01a4450b0f12374bb1');

    const full = encodeQr('q'.repeat(QR_MAX_BYTES));
    expect([full.version, full.size]).toEqual([10, 57]);
    expect(digest(full)).toBe('52f4cf94c844bad3bd9fa05e531f087a1a11ad7513a6680b18883b938a00c83a');
  });

  it('is deterministic', () => {
    expect(rowsOf(encodeQr(INVITE_URL))).toEqual(rowsOf(encodeQr(INVITE_URL)));
  });

  it.each(CAPACITY.map((bytes, index) => [index + 1, bytes] as const))(
    'uses version %i for up to %i bytes and the next one beyond it',
    (version, bytes) => {
      const qr = encodeQr('x'.repeat(bytes));
      expect(qr.version).toBe(version);
      expect(qr.size).toBe(17 + 4 * version);
      expect(qr.modules).toHaveLength(qr.size);
      for (const row of qr.modules) expect(row).toHaveLength(qr.size);

      if (version < CAPACITY.length) {
        expect(encodeQr('x'.repeat(bytes + 1)).version).toBe(version + 1);
      }
    },
  );

  it('refuses a payload longer than the largest supported symbol', () => {
    expect(QR_MAX_BYTES).toBe(213);
    expect(() => encodeQr('x'.repeat(QR_MAX_BYTES + 1))).toThrow(RangeError);
    expect(() => encodeQr('x'.repeat(QR_MAX_BYTES + 1))).toThrow('214 bytes');
    // Counted in bytes: 107 two-byte letters are 214 bytes and do not fit either.
    expect(() => encodeQr('ש'.repeat(107))).toThrow(RangeError);
  });

  it.each([1, 4, 7, 10])('draws the three finder patterns on a version-%i symbol', (version) => {
    const qr = encodeQr('x'.repeat(CAPACITY[version - 1]!));
    const finder = ['#######', '#.....#', '#.###.#', '#.###.#', '#.###.#', '#.....#', '#######'];
    const rows = rowsOf(qr);
    const corner = (left: number, top: number) =>
      rows.slice(top, top + 7).map((row) => row.slice(left, left + 7));

    expect(corner(0, 0)).toEqual(finder);
    expect(corner(qr.size - 7, 0)).toEqual(finder);
    expect(corner(0, qr.size - 7)).toEqual(finder);
    // The light separator beside each finder, and the always-dark module.
    expect(rows[7]!.slice(0, 8)).toBe('........');
    expect(rows[7]!.slice(qr.size - 8)).toBe('........');
    expect(qr.modules[qr.size - 8]![8]).toBe(true);
  });

  it('alternates the timing patterns between the finders', () => {
    const qr = encodeQr(INVITE_URL);
    for (let i = 8; i < qr.size - 8; i++) {
      expect(qr.modules[6]![i], `row timing at ${i}`).toBe(i % 2 === 0);
      expect(qr.modules[i]![6], `column timing at ${i}`).toBe(i % 2 === 0);
    }
  });

  it('places an alignment pattern on versions that have one, clear of the finders', () => {
    // Version 2 has a single pattern, centred on (18, 18).
    const rows = rowsOf(encodeQr('x'.repeat(CAPACITY[1])));
    expect(rows.slice(16, 21).map((row) => row.slice(16, 21))).toEqual([
      '#####',
      '#...#',
      '#.#.#',
      '#...#',
      '#####',
    ]);

    // Version 7 has a 3×3 grid of centres at 6, 22 and 38; the three that would land on
    // a finder are omitted, so the corner modules there are still the finder's own.
    const seven = rowsOf(encodeQr('x'.repeat(CAPACITY[6])));
    expect(seven.slice(20, 25).map((row) => row.slice(20, 25))).toEqual([
      '#####',
      '#...#',
      '#.#.#',
      '#...#',
      '#####',
    ]);
    expect(seven[6]!.slice(0, 7)).toBe('#######');
  });

  it.each([INVITE_URL, 'A', 'q'.repeat(100), 'q'.repeat(QR_MAX_BYTES)])(
    'writes valid format information, twice, declaring level M',
    (text) => {
      const qr = encodeQr(text);
      const raw = readFormatBits(qr);
      expect(readFormatBitsCopy(qr)).toBe(raw);

      const format = raw ^ 0x5412;
      // A valid (15, 5) BCH codeword leaves no remainder against the generator 0x537.
      expect(bchRemainder(format, 0x537, 11)).toBe(0);
      // Bits 14–13 are the error-correction level; `00` is M.
      expect(format >>> 13).toBe(0);
      // Bits 12–10 are the mask, one of the eight.
      expect((format >>> 10) & 0b111).toBeLessThan(8);
    },
  );

  it.each([7, 8, 9, 10])('writes valid version information on a version-%i symbol', (version) => {
    const qr = encodeQr('x'.repeat(CAPACITY[version - 1]!));
    let lower = 0;
    let upper = 0;
    for (let i = 0; i < 18; i++) {
      const a = qr.size - 11 + (i % 3);
      const b = Math.floor(i / 3);
      lower |= (qr.modules[b]![a] ? 1 : 0) << i;
      upper |= (qr.modules[a]![b] ? 1 : 0) << i;
    }
    expect(upper).toBe(lower);
    expect(lower >>> 12).toBe(version);
    // A valid (18, 6) BCH codeword against the generator 0x1f25.
    expect(bchRemainder(lower, 0x1f25, 13)).toBe(0);
  });

  it('leaves the version-information area as data below version 7', () => {
    // Version 6 is the largest symbol without the block; nothing reserves those modules,
    // so two different payloads of the same length differ somewhere inside it.
    const area = (qr: QrCode) =>
      qr.modules.slice(0, 6).map((row) => row.slice(qr.size - 11, qr.size - 8).join());
    const one = encodeQr('a'.repeat(CAPACITY[5]));
    const two = encodeQr('b'.repeat(CAPACITY[5]));
    expect(one.version).toBe(6);
    expect(area(one)).not.toEqual(area(two));
  });
});

describe('qrSvgPath', () => {
  const tiny: QrCode = {
    version: 1,
    size: 4,
    modules: [
      [true, true, false, true],
      [false, false, false, false],
      [false, true, true, true],
      [true, false, false, false],
    ],
  };

  it('draws each horizontal run of dark modules as one rectangle inside the quiet zone', () => {
    expect(QR_QUIET_ZONE).toBe(4);
    expect(qrSvgPath(tiny)).toBe(
      ['M4 4h2v1h-2z', 'M7 4h1v1h-1z', 'M5 6h3v1h-3z', 'M4 7h1v1h-1z'].join(''),
    );
  });

  it('sizes the view box to the symbol plus the quiet zone on both sides', () => {
    expect(qrViewBoxSize(tiny)).toBe(12);
    expect(qrViewBoxSize(encodeQr(INVITE_URL))).toBe(41);
  });

  it('covers exactly the dark modules of a real symbol', () => {
    const qr = encodeQr(INVITE_URL);
    const dark = qr.modules.flat().filter(Boolean).length;
    // Every rectangle is `h<width>` wide and one module tall, so the widths sum to the
    // number of dark modules.
    const drawn = [...qrSvgPath(qr).matchAll(/h(\d+)v1/g)].reduce(
      (sum, match) => sum + Number(match[1]),
      0,
    );
    expect(drawn).toBe(dark);
  });
});
