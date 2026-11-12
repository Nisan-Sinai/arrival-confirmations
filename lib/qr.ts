/**
 * A QR code encoder for the invitation link.
 *
 * A host who prints paper invitations, or stands a sign at the entrance to the hall,
 * needs the link in a form a phone camera can read. Every large RSVP product offers
 * this; here the event page draws the code itself.
 *
 * Written in-house rather than installed, for the same reason the spreadsheet reader in
 * `guestImport.ts` is: the job is a few hundred lines of arithmetic that never changes,
 * and a dependency for it is one more package to audit on every advisory. It also keeps
 * the invitation URL — which *is* the credential (§4.2) — inside the page. The obvious
 * shortcut, an image URL on someone else's QR service, would hand every event's
 * unguessable address to a third party.
 *
 * Scope, chosen to fit the job and nothing wider:
 *
 *   - **Byte mode only.** A URL is ASCII with mixed case, which rules out the
 *     alphanumeric mode (uppercase only) and makes numeric irrelevant.
 *   - **Error correction level M** — recovers roughly 15% damage, the level printers and
 *     paper invitations are normally set at. Higher levels buy robustness with a denser
 *     code, which is the wrong trade for something scanned off a card at arm's length.
 *   - **Versions 1–10**, up to 213 bytes. An invitation link is about sixty.
 *
 * The output is verified in development against an independent decoder (zxing-cpp)
 * across every supported version; the golden vectors in the unit test pin that result.
 */

/** Smallest and largest symbol this encoder produces. */
const MAX_VERSION = 10;

/**
 * Block structure at level M, one row per version:
 * `[ecCodewordsPerBlock, group1Blocks, group1DataCodewords, group2Blocks]`.
 * A group-2 block carries exactly one more data codeword than a group-1 block.
 */
const BLOCKS: readonly (readonly [number, number, number, number])[] = [
  [10, 1, 16, 0],
  [16, 1, 28, 0],
  [26, 1, 44, 0],
  [18, 2, 32, 0],
  [24, 2, 43, 0],
  [16, 4, 27, 0],
  [18, 4, 31, 0],
  [22, 2, 38, 2],
  [22, 3, 36, 2],
  [26, 4, 43, 1],
];

/** Centre coordinates of the alignment patterns, one row per version. */
const ALIGNMENT: readonly (readonly number[])[] = [
  [],
  [6, 18],
  [6, 22],
  [6, 26],
  [6, 30],
  [6, 34],
  [6, 22, 38],
  [6, 24, 42],
  [6, 26, 46],
  [6, 28, 50],
];

/**
 * GF(2⁸) arithmetic for Reed–Solomon, over the QR polynomial x⁸+x⁴+x³+x²+1.
 *
 * The tables are padded so that multiplication needs no zero test. Real logarithms run
 * 0–254, so a real product indexes at most 508; `LOG[0]` is 511, which puts any product
 * involving zero at 511–1022 — inside the table, and in the half that is never written,
 * so it comes back zero on its own.
 */
const EXP = new Uint8Array(1024);
const LOG = new Uint16Array(256);
(() => {
  let value = 1;
  for (let power = 0; power < 255; power++) {
    EXP[power] = value;
    EXP[power + 255] = value;
    LOG[value] = power;
    value <<= 1;
    if (value >= 256) value ^= 0x11d;
  }
  LOG[0] = 511;
})();

const multiply = (a: number, b: number): number => EXP[LOG[a]! + LOG[b]!]!;

/** The error-correction codewords for one block of data. */
function errorCorrection(data: readonly number[], degree: number): number[] {
  // The generator polynomial ∏(x − αⁱ), highest power first, leading 1 implied.
  const generator = new Array<number>(degree).fill(0);
  generator[degree - 1] = 1;
  let root = 1;
  for (let i = 0; i < degree; i++) {
    for (let j = 0; j < degree; j++) {
      generator[j] = multiply(generator[j]!, root) ^ (generator[j + 1] ?? 0);
    }
    root = multiply(root, 2);
  }

  const remainder = new Array<number>(degree).fill(0);
  for (const byte of data) {
    const factor = byte ^ remainder.shift()!;
    remainder.push(0);
    for (let j = 0; j < degree; j++) remainder[j]! ^= multiply(generator[j]!, factor);
  }
  return remainder;
}

/** How many data codewords a version holds at level M. */
function dataCodewordCount(version: number): number {
  const [, group1, size, group2] = BLOCKS[version - 1]!;
  return group1 * size + group2 * (size + 1);
}

/** Bits in the character-count field: one byte up to version 9, two from 10. */
const countBits = (version: number): number => (version < 10 ? 8 : 16);

/** The longest byte string a version can carry. */
function byteCapacity(version: number): number {
  return Math.floor((dataCodewordCount(version) * 8 - 4 - countBits(version)) / 8);
}

/** The longest text, in UTF-8 bytes, this encoder accepts. */
export const QR_MAX_BYTES = byteCapacity(MAX_VERSION);

/** The message as data codewords: mode, length, payload, terminator and padding. */
function buildDataCodewords(bytes: Uint8Array, version: number): number[] {
  const bits: number[] = [];
  const push = (value: number, length: number) => {
    for (let i = length - 1; i >= 0; i--) bits.push((value >>> i) & 1);
  };

  push(0b0100, 4);
  push(bytes.length, countBits(version));
  for (const byte of bytes) push(byte, 8);

  const capacity = dataCodewordCount(version) * 8;
  push(0, Math.min(4, capacity - bits.length));
  push(0, (8 - (bits.length % 8)) % 8);
  // The specification's two alternating pad bytes, until the symbol is full.
  for (let pad = 0xec; bits.length < capacity; pad ^= 0xec ^ 0x11) push(pad, 8);

  const codewords: number[] = [];
  for (let i = 0; i < bits.length; i += 8) {
    codewords.push(bits.slice(i, i + 8).reduce((byte, bit) => (byte << 1) | bit, 0));
  }
  return codewords;
}

/** Splits the data into blocks, adds error correction and interleaves the result. */
function interleave(data: readonly number[], version: number): number[] {
  const [ecLength, group1, size, group2] = BLOCKS[version - 1]!;
  const blocks: number[][] = [];
  let offset = 0;
  for (let index = 0; index < group1 + group2; index++) {
    const length = index < group1 ? size : size + 1;
    blocks.push(data.slice(offset, offset + length));
    offset += length;
  }
  const corrections = blocks.map((block) => errorCorrection(block, ecLength));

  const result: number[] = [];
  for (let i = 0; i <= size; i++) {
    for (const block of blocks) {
      if (i < block.length) result.push(block[i]!);
    }
  }
  for (let i = 0; i < ecLength; i++) {
    for (const correction of corrections) result.push(correction[i]!);
  }
  return result;
}

/** The eight data masks, as predicates over (x, y). */
const MASKS: readonly ((x: number, y: number) => boolean)[] = [
  (x, y) => (x + y) % 2 === 0,
  (_x, y) => y % 2 === 0,
  (x) => x % 3 === 0,
  (x, y) => (x + y) % 3 === 0,
  (x, y) => (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0,
  (x, y) => ((x * y) % 2) + ((x * y) % 3) === 0,
  (x, y) => (((x * y) % 2) + ((x * y) % 3)) % 2 === 0,
  (x, y) => (((x + y) % 2) + ((x * y) % 3)) % 2 === 0,
];

type Grid = boolean[][];

const emptyGrid = (size: number): Grid =>
  Array.from({ length: size }, () => new Array<boolean>(size).fill(false));

/**
 * The fixed furniture of a symbol: finders, timing, alignment, the dark module and the
 * reserved format and version areas. `reserved` marks every module data must not use.
 */
function drawFunctionPatterns(version: number): { modules: Grid; reserved: Grid } {
  const size = version * 4 + 17;
  const modules = emptyGrid(size);
  const reserved = emptyGrid(size);
  const set = (x: number, y: number, dark: boolean) => {
    modules[y]![x] = dark;
    reserved[y]![x] = true;
  };

  for (let i = 0; i < size; i++) {
    set(6, i, i % 2 === 0);
    set(i, 6, i % 2 === 0);
  }

  // Finder patterns with their light separators, clipped at the symbol's edge.
  for (const [centreX, centreY] of [
    [3, 3],
    [size - 4, 3],
    [3, size - 4],
  ] as const) {
    for (let dy = -4; dy <= 4; dy++) {
      for (let dx = -4; dx <= 4; dx++) {
        const x = centreX + dx;
        const y = centreY + dy;
        if (x < 0 || x >= size || y < 0 || y >= size) continue;
        const ring = Math.max(Math.abs(dx), Math.abs(dy));
        set(x, y, ring !== 2 && ring !== 4);
      }
    }
  }

  const centres = ALIGNMENT[version - 1]!;
  const last = centres.length - 1;
  centres.forEach((centreY, row) => {
    centres.forEach((centreX, column) => {
      // The three corners that already hold a finder pattern carry no alignment pattern.
      const onFinder =
        (row === 0 && column === 0) ||
        (row === 0 && column === last) ||
        (row === last && column === 0);
      if (onFinder) return;
      for (let dy = -2; dy <= 2; dy++) {
        for (let dx = -2; dx <= 2; dx++) {
          set(centreX + dx, centreY + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
        }
      }
    });
  });

  // Reserve the format strips now; their bits are written once the mask is chosen.
  for (let i = 0; i < 9; i++) {
    set(8, i, modules[i]![8]!);
    set(i, 8, modules[8]![i]!);
  }
  for (let i = 0; i < 8; i++) {
    set(size - 1 - i, 8, false);
    set(8, size - 1 - i, false);
  }
  set(8, size - 8, true);

  if (version >= 7) {
    // Version information: 6 data bits and a 12-bit BCH remainder, written twice.
    let remainder = version;
    for (let i = 0; i < 12; i++) remainder = (remainder << 1) ^ ((remainder >>> 11) * 0x1f25);
    const bits = (version << 12) | remainder;
    for (let i = 0; i < 18; i++) {
      const dark = ((bits >>> i) & 1) === 1;
      const a = size - 11 + (i % 3);
      const b = Math.floor(i / 3);
      set(a, b, dark);
      set(b, a, dark);
    }
  }

  return { modules, reserved };
}

/** Writes the 15 format bits — level M and the mask — into both reserved strips. */
function drawFormatBits(modules: Grid, mask: number): void {
  const size = modules.length;
  // Level M is `00`, so the five data bits are the mask number alone.
  let remainder = mask;
  for (let i = 0; i < 10; i++) remainder = (remainder << 1) ^ ((remainder >>> 9) * 0x537);
  const bits = ((mask << 10) | remainder) ^ 0x5412;
  const bit = (i: number) => ((bits >>> i) & 1) === 1;

  for (let i = 0; i <= 5; i++) modules[i]![8] = bit(i);
  modules[7]![8] = bit(6);
  modules[8]![8] = bit(7);
  modules[8]![7] = bit(8);
  for (let i = 9; i < 15; i++) modules[8]![14 - i] = bit(i);

  for (let i = 0; i < 8; i++) modules[8]![size - 1 - i] = bit(i);
  for (let i = 8; i < 15; i++) modules[size - 15 + i]![8] = bit(i);
}

/** Lays the codewords out in the two-column zigzag, skipping reserved modules. */
function drawCodewords(modules: Grid, reserved: Grid, codewords: readonly number[]): void {
  const size = modules.length;
  const total = codewords.length * 8;
  let index = 0;
  for (let right = size - 1; right >= 1; right -= 2) {
    // The vertical timing pattern occupies column 6; the zigzag steps over it.
    if (right === 6) right = 5;
    const upward = ((right + 1) & 2) === 0;
    for (let step = 0; step < size; step++) {
      const y = upward ? size - 1 - step : step;
      for (const x of [right, right - 1]) {
        // Anything past the last codeword is a remainder bit and stays light.
        if (reserved[y]![x] || index >= total) continue;
        modules[y]![x] = ((codewords[index >>> 3]! >>> (7 - (index & 7))) & 1) === 1;
        index++;
      }
    }
  }
}

/**
 * The specification's penalty score for a finished symbol — lower scans better.
 *
 * Four rules: long single-colour runs, 2×2 blocks, finder-like 1:1:3:1:1 sequences, and
 * an overall dark/light imbalance. The choice of mask affects only how easily a camera
 * locks on; every mask decodes to the same text, because the format bits name it.
 */
function penalty(modules: Grid): number {
  const size = modules.length;
  let score = 0;

  const lines: boolean[][] = [];
  for (let i = 0; i < size; i++) {
    lines.push(modules[i]!);
    lines.push(modules.map((row) => row[i]!));
  }
  for (const line of lines) {
    let run = 1;
    for (let i = 1; i <= size; i++) {
      if (i < size && line[i] === line[i - 1]) {
        run++;
        continue;
      }
      if (run >= 5) score += run - 2;
      run = 1;
    }
    const text = line.map((dark) => (dark ? '1' : '0')).join('');
    for (const pattern of ['10111010000', '00001011101']) {
      for (let at = text.indexOf(pattern); at !== -1; at = text.indexOf(pattern, at + 1)) {
        score += 40;
      }
    }
  }

  let dark = 0;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const colour = modules[y]![x]!;
      if (colour) dark++;
      if (
        x + 1 < size &&
        y + 1 < size &&
        colour === modules[y]![x + 1] &&
        colour === modules[y + 1]![x] &&
        colour === modules[y + 1]![x + 1]
      ) {
        score += 3;
      }
    }
  }

  const percent = (dark * 100) / (size * size);
  return score + Math.floor(Math.abs(percent - 50) / 5) * 10;
}

export interface QrCode {
  /** 1–10. The symbol is `17 + 4 × version` modules on a side. */
  readonly version: number;
  /** Modules per side, without any quiet zone. */
  readonly size: number;
  /** `modules[y][x]` is true for a dark module. */
  readonly modules: readonly (readonly boolean[])[];
}

/**
 * Encodes text as a QR code.
 *
 * @throws RangeError when the text is longer than {@link QR_MAX_BYTES} UTF-8 bytes.
 */
export function encodeQr(text: string): QrCode {
  const bytes = new TextEncoder().encode(text);
  let version = 1;
  while (bytes.length > byteCapacity(version)) {
    version++;
    if (version > MAX_VERSION) {
      throw new RangeError(`QR payload is ${bytes.length} bytes; the limit is ${QR_MAX_BYTES}.`);
    }
  }

  const codewords = interleave(buildDataCodewords(bytes, version), version);
  const { modules: base, reserved } = drawFunctionPatterns(version);
  drawCodewords(base, reserved, codewords);

  let best: Grid = base;
  let bestScore = Infinity;
  MASKS.forEach((mask, number) => {
    const candidate = base.map((row, y) =>
      row.map((dark, x) => (reserved[y]![x] ? dark : dark !== mask(x, y))),
    );
    drawFormatBits(candidate, number);
    const score = penalty(candidate);
    if (score < bestScore) {
      best = candidate;
      bestScore = score;
    }
  });

  return { version, size: best.length, modules: best };
}

/**
 * The quiet zone the specification requires on every side, in modules. A code printed
 * flush against a border or a photograph is the commonest reason one fails to scan.
 */
export const QR_QUIET_ZONE = 4;

/**
 * The dark modules as one SVG path, in module units, offset by the quiet zone.
 *
 * Each horizontal run becomes a single rectangle, so the path stays a few kilobytes and
 * the code renders crisply at any size — on a phone, and on a printed card.
 */
export function qrSvgPath(qr: QrCode): string {
  const parts: string[] = [];
  qr.modules.forEach((row, y) => {
    let start = -1;
    for (let x = 0; x <= row.length; x++) {
      const dark = row[x] === true;
      if (dark && start === -1) start = x;
      if (!dark && start !== -1) {
        const width = x - start;
        parts.push(`M${start + QR_QUIET_ZONE} ${y + QR_QUIET_ZONE}h${width}v1h-${width}z`);
        start = -1;
      }
    }
  });
  return parts.join('');
}

/** The side of the SVG view box: the symbol plus the quiet zone on both sides. */
export const qrViewBoxSize = (qr: QrCode): number => qr.size + QR_QUIET_ZONE * 2;
