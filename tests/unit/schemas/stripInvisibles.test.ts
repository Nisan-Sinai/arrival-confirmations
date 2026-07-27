import { describe, expect, it } from 'vitest';

import { fullNameSchema } from '@/schemas/rsvp';

/**
 * The invisible-character filter, pinned.
 *
 * `stripInvisibles` is not exported — it is an implementation detail of the schema —
 * so these assertions go through `fullNameSchema`, which is how the application
 * reaches it. That is the right level anyway: what matters is that a name cannot
 * carry a bidi override, not which private function removes it.
 *
 * Why this test exists now. The character class used to be written with raw code
 * points, which put a literal NUL byte in the source; git classified the file as
 * binary and stopped diffing it, so any change to these ranges would have been
 * invisible in review. The class is escaped now, and this locks the behaviour so the
 * rewrite is provably equivalent and a future edit cannot quietly widen or narrow it.
 *
 * Code points are built with `String.fromCharCode` rather than typed literally, for
 * exactly the reason above: source files should stay plain text.
 */

const ch = (code: number) => String.fromCharCode(code);

describe('names are stripped of characters that lie about their position', () => {
  /**
   * The attack this prevents. U+202E (RIGHT-TO-LEFT OVERRIDE) reorders everything
   * after it, so a guest could enter a name that renders as somebody else's in the
   * host's table. React escapes HTML, so this was never about injection — it is about
   * a name being able to misrepresent what it sits next to.
   */
  it('removes bidi overrides and embeddings (U+202A–U+202E)', () => {
    for (const code of [0x202a, 0x202b, 0x202c, 0x202d, 0x202e]) {
      expect(fullNameSchema.parse(`דנה${ch(code)} כהן`)).toBe('דנה כהן');
    }
  });

  it('removes bidi isolates (U+2066–U+2069)', () => {
    for (const code of [0x2066, 0x2067, 0x2068, 0x2069]) {
      expect(fullNameSchema.parse(`דנה${ch(code)} כהן`)).toBe('דנה כהן');
    }
  });

  it('removes zero-width and directional marks (U+200B–U+200F)', () => {
    for (const code of [0x200b, 0x200c, 0x200d, 0x200e, 0x200f]) {
      expect(fullNameSchema.parse(`דנה${ch(code)}כהן`)).toBe('דנהכהן');
    }
  });

  it('removes C0 control characters and DEL', () => {
    for (const code of [0x0000, 0x0001, 0x0008, 0x000b, 0x001b, 0x001f, 0x007f]) {
      expect(fullNameSchema.parse(`דנה${ch(code)}כהן`)).toBe('דנהכהן');
    }
  });

  /**
   * Tab and newline are deliberately outside the class — the range skips U+0009 and
   * U+000A. They are legitimate whitespace, and `collapseWhitespace` turns them into
   * a single space rather than deleting them, which is what keeps "דנה\tכהן" reading
   * as two words instead of one.
   */
  it('keeps tab and newline as whitespace rather than deleting them', () => {
    expect(fullNameSchema.parse(`דנה${ch(0x0009)}כהן`)).toBe('דנה כהן');
    expect(fullNameSchema.parse(`דנה${ch(0x000a)}כהן`)).toBe('דנה כהן');
  });

  it('leaves an ordinary Hebrew name untouched', () => {
    expect(fullNameSchema.parse('משפחת סיני')).toBe('משפחת סיני');
    expect(fullNameSchema.parse('  דנה   ויונתן  ')).toBe('דנה ויונתן');
  });

  /** Niqqud and geresh are meaningful in Hebrew names and must survive. */
  it('preserves Hebrew diacritics and punctuation', () => {
    expect(fullNameSchema.parse('שְׁלֹמֹה')).toBe('שְׁלֹמֹה');
    expect(fullNameSchema.parse('בת״י')).toBe('בת״י');
  });

  it('still rejects a name that is only invisible characters', () => {
    // Stripped to nothing, so the minimum-length rule is what refuses it.
    expect(fullNameSchema.safeParse(ch(0x200b) + ch(0x202e)).success).toBe(false);
  });
});
