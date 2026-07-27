import { describe, expect, it } from 'vitest';

import { toVisualSegments } from '@/lib/ogText';

/**
 * Right-to-left text for the share images (§12).
 *
 * These cases are written the only way this can be checked in a text file: the expected
 * value of a Hebrew word is built with `mirrored`, a plain array reverse that shares no
 * code with the implementation. Reading a reversed Hebrew literal in a diff is not
 * something a human does reliably, and a test nobody can read is a test nobody trusts.
 *
 * The bug being guarded is not hypothetical. Satori draws glyphs in memory order, so an
 * invitation went out previewing its honoree as `רקיה וננב`, and the failure is
 * invisible to everything except a person who reads Hebrew.
 */

/** The visual form of a wholly Hebrew word: its letters, last one first. */
function mirrored(word: string): string {
  return [...word].reverse().join('');
}

describe('toVisualSegments', () => {
  it('returns Hebrew words in reading order, each drawn back to front', () => {
    // The line from the invitation that shipped reversed.
    expect(toVisualSegments('בננו היקר')).toEqual([mirrored('בננו'), mirrored('היקר')]);
  });

  it('keeps a date in the order it is read', () => {
    // A reversed date is the one failure here that costs a guest the event.
    expect(toVisualSegments('יום ג׳ 29.7.2026 14:30')).toEqual([
      mirrored('יום'),
      mirrored('ג׳'),
      '29.7.2026',
      '14:30',
    ]);
  });

  it('keeps a number joined by separators together (W4)', () => {
    expect(toVisualSegments('2026-2027')).toEqual(['2026-2027']);
  });

  it('keeps a terminator with the number it belongs to (W5)', () => {
    expect(toVisualSegments('50%')).toEqual(['50%']);
  });

  it('places a number to the left of the Hebrew it follows', () => {
    // Reversed wholesale this is `6202-ןב`, which is why the levels exist.
    expect(toVisualSegments('בן-2026')).toEqual([`2026-${mirrored('בן')}`]);
  });

  it('does not break an English name into its words', () => {
    // The spaces inside it resolve to left-to-right, so they are not line breaks — a
    // venue called Kibbutz Ein Gedi must not preview as Gedi Ein Kibbutz.
    expect(toVisualSegments('Kibbutz Ein Gedi')).toEqual(['Kibbutz Ein Gedi']);
  });

  it('orders a mixed line right to left while each English run reads left to right', () => {
    expect(toVisualSegments('אולם Hilton תל אביב')).toEqual([
      mirrored('אולם'),
      'Hilton',
      mirrored('תל'),
      mirrored('אביב'),
    ]);
  });

  it('keeps punctuation on the trailing side of the word it follows', () => {
    expect(toVisualSegments('שלום, עולם')).toEqual([mirrored('שלום,'), mirrored('עולם')]);
  });

  it('mirrors brackets so they still enclose what they opened (L4)', () => {
    // Read on screen from the right: `(`, the word, `2`, `)`.
    expect(toVisualSegments('(אולם 2)')).toEqual([`${mirrored('אולם')})`, '(2']);
  });

  it('carries niqqud with the letter it points', () => {
    const alefQamats = 'אָ';
    expect(toVisualSegments(`${alefQamats}ב`)).toEqual([`ב${alefQamats}`]);
  });

  it('drops whitespace at the edges rather than emitting empty words', () => {
    expect(toVisualSegments('  שלום  עולם  ')).toEqual([mirrored('שלום'), mirrored('עולם')]);
  });

  it('has nothing to draw for an empty or blank string', () => {
    expect(toVisualSegments('')).toEqual([]);
    expect(toVisualSegments('   ')).toEqual([]);
  });

  it('leaves a wholly left-to-right line alone (W7)', () => {
    // The number belongs to the English before it, so the space is not a break.
    expect(toVisualSegments('RSVP 2026')).toEqual(['RSVP 2026']);
  });

  it('still breaks before a number that follows Hebrew', () => {
    // The mirror image of the case above: here W7 must not fire.
    expect(toVisualSegments('אולם 3')).toEqual([mirrored('אולם'), '3']);
  });
});
