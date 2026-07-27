/**
 * Right-to-left text for the share images (§12).
 *
 * Satori — the renderer behind `next/og` — implements no part of the Unicode
 * bidirectional algorithm. It places glyphs in memory order, left to right, and its
 * `direction: rtl` moves boxes around without touching the text inside them. Hebrew
 * handed to it straight comes out mirrored, so an invitation for `בננו היקר` previews
 * as `רקיה וננב`. That is not a typo a guest forgives, because the share card is the
 * first and sometimes the only thing fifty relatives read of an invitation.
 *
 * The reordering therefore happens here, before the string reaches the renderer. This
 * is a deliberately small slice of UAX #9 — no explicit embedding controls, no
 * isolates, no Arabic shaping — covering what an invitation actually contains: Hebrew,
 * Latin digits, the occasional Latin venue name, and punctuation between them. The
 * rules that are implemented are implemented properly, because the near-miss versions
 * are worse than useless: reversing a string wholesale turns a date into `6202.7.92`,
 * and a date read backwards is a guest arriving on the wrong day.
 *
 * The output is a list of *segments* rather than one visually-ordered string, and that
 * is the other half of the problem. A single pre-reversed string wraps in the wrong
 * place: Satori breaks it into lines by width, so the first line would hold the end of
 * the sentence. Segments are the line-breaking opportunities, handed over in logical
 * order for a `row-reverse` wrapping row — lines then fill from the right and run down
 * the card in the order they are read. See `OgText`.
 */

/**
 * The paragraph level. Everything these cards print is Hebrew-first, including a
 * wholly English venue name, which belongs on the right of a Hebrew invitation.
 */
const BASE_LEVEL = 1;

/**
 * Strongly right-to-left scripts: Hebrew, Arabic, Syriac, Thaana, N'Ko, Samaritan and
 * the Arabic presentation forms. Only Hebrew is expected; the rest cost nothing and
 * stop a copied-in name rendering backwards.
 *
 * Written as escapes rather than as the characters themselves. A range endpoint here is
 * often an unassigned or invisible code point, and one that is silently wrong is not
 * something a reader of this file could have seen.
 */
const RTL_SCRIPT = /[֐-׿؀-޿ࠀ-࡟ࢠ-ࣿיִ-﷿ﹰ-﻿]/u;

/** Bidi class `CS` — a separator that binds two numbers together, as in `14:30`. */
const COMMON_SEPARATOR = /[,.:/ ،٫٬，．：]/u;

/** Bidi class `ES` — the separators that may sign or join a number, as in `2026-2027`. */
const EUROPEAN_SEPARATOR = /[+\-−]/u;

/** Bidi class `ET` — terminators that belong to an adjacent number, as in `50%`. */
const EUROPEAN_TERMINATOR = /[#$%°‰₠-₿]/u;

/**
 * Rule L4: a mirrored character is drawn as its mirror image in a right-to-left run.
 * Without this, a name in brackets closes with the bracket it opened with.
 */
const MIRRORED = new Map([
  ['(', ')'],
  [')', '('],
  ['[', ']'],
  [']', '['],
  ['{', '}'],
  ['}', '{'],
  ['<', '>'],
  ['>', '<'],
  ['«', '»'],
  ['»', '«'],
  ['‹', '›'],
  ['›', '‹'],
]);

/**
 * A base character with any combining marks that belong to it — niqqud, in practice.
 * Marks travel with their base rather than being reordered on their own, which is rule
 * W1 done structurally: reverse a pointed string character by character and every vowel
 * lands under the wrong letter. The second alternative catches a mark with no base,
 * which is malformed input but must not be dropped.
 */
const GRAPHEME = /\P{M}\p{M}*|\p{M}+/gu;

type BidiClass = 'R' | 'L' | 'EN' | 'CS' | 'ES' | 'ET' | 'WS' | 'ON';

interface Cluster {
  readonly text: string;
  type: BidiClass;
  level: number;
}

function classify(cluster: string): BidiClass {
  const base = cluster[0] ?? '';
  if (RTL_SCRIPT.test(base)) return 'R';
  if (/\p{Nd}/u.test(base)) return 'EN';
  if (/\p{L}/u.test(base)) return 'L';
  if (COMMON_SEPARATOR.test(base)) return 'CS';
  if (EUROPEAN_SEPARATOR.test(base)) return 'ES';
  if (EUROPEAN_TERMINATOR.test(base)) return 'ET';
  if (/\s/u.test(base)) return 'WS';
  return 'ON';
}

/** The neutral types — the ones rules N1 and N2 resolve from their surroundings. */
function isNeutral(type: BidiClass): boolean {
  return type === 'CS' || type === 'ES' || type === 'ET' || type === 'WS' || type === 'ON';
}

/**
 * Rules W4 and W5: separators and terminators that are part of a number rather than
 * text between numbers. A date is one number-ish run and has to stay in that order.
 * Without W4 its dots resolve to Hebrew, the run splits into three, and the day and the
 * year swap places.
 */
function resolveNumericContext(clusters: Cluster[]): void {
  // W4: a *single* separator between two numbers joins them.
  for (let index = 1; index < clusters.length - 1; index++) {
    const type = clusters[index]!.type;
    if (type !== 'CS' && type !== 'ES') continue;
    if (clusters[index - 1]!.type === 'EN' && clusters[index + 1]!.type === 'EN') {
      clusters[index]!.type = 'EN';
    }
  }

  // W5: a run of terminators adjacent to a number joins it, from either side.
  for (let index = 0; index < clusters.length; index++) {
    if (clusters[index]!.type !== 'ET') continue;
    let end = index;
    while (end + 1 < clusters.length && clusters[end + 1]!.type === 'ET') end++;
    if (clusters[index - 1]?.type === 'EN' || clusters[end + 1]?.type === 'EN') {
      for (let inner = index; inner <= end; inner++) clusters[inner]!.type = 'EN';
    }
    index = end;
  }

  // W7: a number whose nearest strong text to the left is left-to-right belongs to that
  // text rather than to the paragraph. This is what keeps `Hall 3` in one piece; without
  // it the number counts as Hebrew context, the space between them becomes a break at
  // the paragraph level, and the venue previews as `3 Hall`.
  let lastStrong: 'R' | 'L' = 'R'; // sos, which is the paragraph direction.
  for (const cluster of clusters) {
    if (cluster.type === 'R' || cluster.type === 'L') {
      lastStrong = cluster.type;
      continue;
    }
    if (cluster.type === 'EN' && lastStrong === 'L') cluster.type = 'L';
  }
}

/**
 * Rule I2: inside a right-to-left paragraph, left-to-right text and numbers sit one
 * level deeper. Two levels is all this implementation ever produces, which is all an
 * invitation needs.
 */
function assignLevels(clusters: Cluster[]): void {
  for (const cluster of clusters) {
    if (isNeutral(cluster.type)) continue;
    cluster.level = cluster.type === 'R' ? BASE_LEVEL : BASE_LEVEL + 1;
  }
}

/**
 * Rules N1 and N2: a neutral run takes the direction of what surrounds it when both
 * sides agree, and the paragraph direction when they do not. Numbers count as
 * right-to-left context here, which is what keeps the space before a date a Hebrew
 * space — and therefore a place the line may break — rather than part of the date.
 */
function resolveNeutrals(clusters: Cluster[]): void {
  const strongDirection = (index: number): 'R' | 'L' | null => {
    const type = clusters[index]?.type;
    if (type === undefined || isNeutral(type)) return null;
    // N1: "European and Arabic numbers act as if they were R".
    return type === 'L' ? 'L' : 'R';
  };

  for (let index = 0; index < clusters.length; index++) {
    if (!isNeutral(clusters[index]!.type)) continue;

    let end = index;
    while (end + 1 < clusters.length && isNeutral(clusters[end + 1]!.type)) end++;

    // sos and eos take the paragraph direction, so both ends of the string behave as a
    // Hebrew edge would.
    const before = index === 0 ? 'R' : strongDirection(index - 1);
    const after = end === clusters.length - 1 ? 'R' : strongDirection(end + 1);
    const resolved = before !== null && before === after ? before : 'R';

    for (let inner = index; inner <= end; inner++) {
      // The type is left alone — `WS` still marks where a line may break — and only the
      // level records the resolution.
      clusters[inner]!.level = resolved === 'L' ? BASE_LEVEL + 1 : BASE_LEVEL;
    }
    index = end;
  }
}

/**
 * Rule L2: reverse each contiguous run at the deepest level, then at every level down
 * to the paragraph's. Applied per segment, because the layout is what orders the
 * segments themselves.
 */
function reorder(clusters: Cluster[]): Cluster[] {
  const ordered = clusters.slice();
  let deepest = BASE_LEVEL;
  for (const cluster of ordered) deepest = Math.max(deepest, cluster.level);

  for (let level = deepest; level >= BASE_LEVEL; level--) {
    let start = 0;
    while (start < ordered.length) {
      if (ordered[start]!.level < level) {
        start++;
        continue;
      }
      let end = start;
      while (end + 1 < ordered.length && ordered[end + 1]!.level >= level) end++;
      for (let low = start, high = end; low < high; low++, high--) {
        const swap = ordered[low]!;
        ordered[low] = ordered[high]!;
        ordered[high] = swap;
      }
      start = end + 1;
    }
  }

  return ordered;
}

function render(clusters: Cluster[]): string {
  return clusters
    .map((cluster) => {
      // L4 mirrors only what ended up in a right-to-left run.
      if (cluster.level % 2 === 0) return cluster.text;
      return MIRRORED.get(cluster.text) ?? cluster.text;
    })
    .join('');
}

/**
 * Reorders one string for a renderer that has no bidi of its own, and splits it where a
 * line may break.
 *
 * Each returned segment is already in visual order and is meant to be drawn left to
 * right. The segments themselves come back in *logical* order, for a `row-reverse` row
 * that places the first of them furthest right.
 *
 * Only whitespace that resolved to the paragraph direction becomes a break. The spaces
 * inside an English venue name stay inside one segment, so it is not turned back to
 * front, while a space between two Hebrew words is a break like any other.
 */
export function toVisualSegments(text: string): string[] {
  const clusters: Cluster[] = (text.match(GRAPHEME) ?? []).map((grapheme) => ({
    text: grapheme,
    type: classify(grapheme),
    level: BASE_LEVEL,
  }));
  if (clusters.length === 0) return [];

  resolveNumericContext(clusters);
  assignLevels(clusters);
  resolveNeutrals(clusters);

  const segments: string[] = [];
  let pending: Cluster[] = [];
  for (const cluster of clusters) {
    if (cluster.type === 'WS' && cluster.level === BASE_LEVEL) {
      if (pending.length > 0) segments.push(render(reorder(pending)));
      pending = [];
      continue;
    }
    pending.push(cluster);
  }
  if (pending.length > 0) segments.push(render(reorder(pending)));

  return segments;
}
