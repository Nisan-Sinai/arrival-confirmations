import { describe, expect, it } from 'vitest';

import {
  alternateLocale,
  defaultLocale,
  directionOf,
  isLocale,
  languageAlternates,
  languageTag,
  localeFromPath,
  localePath,
  locales,
  openGraphLocale,
  stripLocale,
  type Locale,
} from '@/lib/i18n';

describe('locales', () => {
  it('offers exactly the two languages the site is written in', () => {
    expect([...locales]).toEqual(['he', 'en']);
  });

  it('defaults to Hebrew, which is the language at the root of the site', () => {
    expect(defaultLocale).toBe('he');
  });

  it('recognises its own locales and nothing else', () => {
    for (const locale of locales) expect(isLocale(locale)).toBe(true);
    for (const other of ['', 'HE', 'en-GB', 'fr', 'he/en']) {
      expect(isLocale(other), other).toBe(false);
    }
  });
});

describe('directionOf', () => {
  it('reads Hebrew right to left and English left to right', () => {
    expect(directionOf('he')).toBe('rtl');
    expect(directionOf('en')).toBe('ltr');
  });
});

describe('languageTag and openGraphLocale', () => {
  it('emits a BCP 47 tag per locale', () => {
    expect(languageTag('he')).toBe('he-IL');
    expect(languageTag('en')).toBe('en-GB');
  });

  it('emits the underscored form Open Graph expects', () => {
    // og:locale is not BCP 47 — a hyphen here is silently ignored by crawlers.
    expect(openGraphLocale('he')).toBe('he_IL');
    expect(openGraphLocale('en')).toBe('en_GB');
  });
});

describe('localePath', () => {
  it('leaves Hebrew paths untouched', () => {
    // The invitation links already sent over WhatsApp point at these exact paths.
    expect(localePath('he', '/e/abc123')).toBe('/e/abc123');
    expect(localePath('he', '/')).toBe('/');
    expect(localePath('he')).toBe('/');
  });

  it('prefixes English without leaving a trailing slash on the home page', () => {
    expect(localePath('en', '/')).toBe('/en');
    expect(localePath('en')).toBe('/en');
    expect(localePath('en', '/pricing')).toBe('/en/pricing');
  });

  it('accepts a path that forgot its leading slash', () => {
    expect(localePath('he', 'pricing')).toBe('/pricing');
    expect(localePath('en', 'pricing')).toBe('/en/pricing');
  });
});

describe('alternateLocale', () => {
  it('points each locale at the other one', () => {
    expect(alternateLocale('he')).toBe('en');
    expect(alternateLocale('en')).toBe('he');
  });

  it('returns to the original locale when applied twice', () => {
    for (const locale of locales) {
      expect(alternateLocale(alternateLocale(locale))).toBe(locale);
    }
  });
});

describe('stripLocale', () => {
  it('removes an English prefix and leaves everything else alone', () => {
    expect(stripLocale('/en')).toBe('/');
    expect(stripLocale('/en/pricing')).toBe('/pricing');
    expect(stripLocale('/pricing')).toBe('/pricing');
    expect(stripLocale('/')).toBe('/');
  });

  it('never returns an empty string, which is not a path', () => {
    expect(stripLocale('')).toBe('/');
  });

  it('does not mistake a path that merely starts with the letters for a prefix', () => {
    // /english is a page, not the English version of /glish.
    expect(stripLocale('/english')).toBe('/english');
  });
});

describe('localeFromPath', () => {
  it('reads the locale a pathname is served under', () => {
    expect(localeFromPath('/en')).toBe('en');
    expect(localeFromPath('/en/pricing')).toBe('en');
    expect(localeFromPath('/')).toBe('he');
    expect(localeFromPath('/pricing')).toBe('he');
    expect(localeFromPath('/english')).toBe('he');
  });

  it('round-trips with localePath for every locale', () => {
    for (const locale of locales) {
      for (const path of ['/', '/pricing', '/e/abc123']) {
        const prefixed = localePath(locale, path);
        expect(localeFromPath(prefixed), prefixed).toBe(locale);
        expect(stripLocale(prefixed), prefixed).toBe(path);
      }
    }
  });
});

describe('languageAlternates', () => {
  it('names every locale, so neither page competes with its own translation', () => {
    expect(languageAlternates('/pricing')).toEqual({
      he: '/pricing',
      en: '/en/pricing',
    });
  });

  it('covers the home page by default', () => {
    expect(languageAlternates()).toEqual({ he: '/', en: '/en' });
  });

  it('lists one entry per locale and no others', () => {
    const keys = Object.keys(languageAlternates()) as Locale[];
    expect(keys.sort()).toEqual([...locales].sort());
  });
});
