import { describe, expect, it } from 'vitest';

import { getDictionary, type Dictionary } from '@/config/dictionary';
import { en } from '@/config/dictionary/en';
import { he } from '@/config/dictionary/he';
import { UI_MESSAGES } from '@/config/messages';
import { locales, type Locale } from '@/lib/i18n';

/** Every leaf string in the dictionary, with the path that reaches it. */
function entries(value: unknown, path: string[] = []): Array<[string, string]> {
  if (typeof value === 'string') return [[path.join('.'), value]];
  if (value && typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>).flatMap(([key, child]) =>
      entries(child, [...path, key]),
    );
  }
  return [];
}

const HEBREW = /[֐-׿]/;

/**
 * Entries that are data rather than prose, and so read identically in both languages.
 *
 * Listed one by one rather than matched by a rule. "Skip anything containing a digit"
 * would also excuse `10 free replies`, which is prose and has to be translated, and an
 * exemption that quietly widens is exactly how an untranslated string reaches a reader.
 * Every line here is a decision somebody can push back on in review.
 */
const LANGUAGE_NEUTRAL = new Set([
  // A clock time. 19:00 is 19:00 in either language.
  'landing.invitationPreview.timeValue',
]);

/** Keys exempt from the alphabet and translation checks, with the reason attached. */
function isExempt(key: string): boolean {
  // The switcher is labelled in the language it switches *to*, so the Hebrew
  // dictionary carries Latin text and the English one carries Hebrew.
  return key.startsWith('languageSwitch') || LANGUAGE_NEUTRAL.has(key);
}

describe('dictionary', () => {
  it('serves a dictionary for every locale', () => {
    for (const locale of locales) {
      expect(getDictionary(locale), locale).toBeDefined();
    }
    expect(getDictionary('he')).toBe(he);
    expect(getDictionary('en')).toBe(en);
  });

  it('keeps the two languages structurally identical', () => {
    // A key present in one language and missing in the other is a blank space on the
    // page for half the visitors. The type already forbids it; this catches the case
    // where a locale grows a key the type does not describe.
    const keysOf = (dictionary: Dictionary) =>
      entries(dictionary)
        .map(([key]) => key)
        .sort();
    expect(keysOf(en)).toEqual(keysOf(he));
  });

  it('leaves no string empty in either language', () => {
    for (const locale of locales) {
      for (const [key, value] of entries(getDictionary(locale))) {
        expect(value.trim(), `${locale}: ${key}`).not.toBe('');
      }
    }
  });

  it('writes Hebrew copy in Hebrew', () => {
    for (const [key, value] of entries(he)) {
      if (isExempt(key)) continue;
      expect(HEBREW.test(value), `${key}: ${value}`).toBe(true);
    }
  });

  it('leaves no Hebrew in the English copy except the switcher', () => {
    // An untranslated string is easiest to spot by the alphabet it is written in.
    for (const [key, value] of entries(en)) {
      if (isExempt(key)) continue;
      expect(HEBREW.test(value), `${key}: ${value}`).toBe(false);
    }
  });

  it('translates the prose rather than copying it across', () => {
    const english = new Map(entries(en));
    for (const [key, hebrew] of entries(he)) {
      if (isExempt(key)) continue;
      expect(english.get(key), key).not.toBe(hebrew);
    }
  });

  it('points each switcher at the other language', () => {
    // Written in the target language, so a reader who cannot read the current one can
    // still find the way out.
    expect(HEBREW.test(he.languageSwitch.label)).toBe(false);
    expect(HEBREW.test(en.languageSwitch.label)).toBe(true);
  });

  it('keeps UI_MESSAGES as the Hebrew dictionary rather than a second original', () => {
    // These were two copies of the same Hebrew strings; the duplicate is what would
    // have drifted.
    expect(UI_MESSAGES).toBe(he);
  });

  it('covers every locale in the lookup table', () => {
    const seen = new Set<Dictionary>();
    for (const locale of locales as readonly Locale[]) seen.add(getDictionary(locale));
    expect(seen.size).toBe(locales.length);
  });
});
