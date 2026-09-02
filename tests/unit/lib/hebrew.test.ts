import { describe, expect, it } from 'vitest';

import { prefixHebrew } from '@/lib/hebrew';

/**
 * The bug this closes was live, in every guest-facing message.
 *
 * The live database holds an event titled "הברית של יונתן", and the invitation template
 * concatenated a bare `ל`, producing "להברית של יונתן" — which a native speaker reads as
 * a typo, in a message sent to every guest on the list.
 */
describe('prefixHebrew', () => {
  it('absorbs the definite article after ל, ב and כ', () => {
    expect(prefixHebrew('ל', 'החתונה')).toBe('לחתונה');
    expect(prefixHebrew('ב', 'הברית')).toBe('בברית');
    expect(prefixHebrew('כ', 'המסיבה')).toBe('כמסיבה');
  });

  it('fixes the title that is actually in the database', () => {
    expect(prefixHebrew('ל', 'הברית של יונתן')).toBe('לברית של יונתן');
  });

  it('leaves an indefinite phrase alone', () => {
    expect(prefixHebrew('ל', 'חתונת נועה ויונתן')).toBe('לחתונת נועה ויונתן');
    expect(prefixHebrew('ב', 'ברית מילה — משפחת סיני')).toBe('בברית מילה — משפחת סיני');
  });

  it('does not absorb after a preposition that never merges', () => {
    // מ and ש keep the article: "מהחתונה", not "מחתונה".
    expect(prefixHebrew('מ', 'החתונה')).toBe('מהחתונה');
    expect(prefixHebrew('ש', 'החתונה')).toBe('שהחתונה');
  });

  it('trims the phrase, so a stray space cannot hide the article', () => {
    expect(prefixHebrew('ל', '  החתונה  ')).toBe('לחתונה');
    expect(prefixHebrew('ל', '  חתונה')).toBe('לחתונה');
  });

  it('returns the preposition alone for an empty phrase', () => {
    expect(prefixHebrew('ל', '')).toBe('ל');
    expect(prefixHebrew('ל', '   ')).toBe('ל');
  });

  it('does not swallow a phrase that is only the letter ה', () => {
    // Absorbing here would leave the preposition attached to nothing at all.
    expect(prefixHebrew('ל', 'ה')).toBe('לה');
  });

  it('is the documented limit: a bare name beginning with ה is mangled', () => {
    // Written down rather than fixed. Telling a definite article from a name that starts
    // with one needs a dictionary, and event titles here are phrases — "החתונה של הילה",
    // not "הילה" — so the rare miss costs less than being wrong on every definite title.
    expect(prefixHebrew('ל', 'הילה')).toBe('לילה');
    expect(prefixHebrew('ל', 'החתונה של הילה')).toBe('לחתונה של הילה');
  });
});
