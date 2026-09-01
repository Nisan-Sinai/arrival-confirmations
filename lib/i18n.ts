/**
 * Locale primitives (§12).
 *
 * Hebrew is the default and stays at the root of the site: `/e/abc` is a link that has
 * already been sent to guests over WhatsApp, and a scheme that moved it to `/he/e/abc`
 * would break every invitation in flight. English is therefore a prefix on top of the
 * existing paths rather than a replacement for them.
 */

export const locales = ['he', 'en'] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = 'he';

export function isLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value);
}

/** Hebrew reads right to left; the document direction follows the locale, not the user. */
export function directionOf(locale: Locale): 'rtl' | 'ltr' {
  return locale === 'he' ? 'rtl' : 'ltr';
}

/** The BCP 47 tag, for `lang`, `hreflang` and `Intl` formatters. */
export function languageTag(locale: Locale): 'he-IL' | 'en-GB' {
  return locale === 'he' ? 'he-IL' : 'en-GB';
}

/** The Open Graph locale, which uses an underscore rather than a hyphen. */
export function openGraphLocale(locale: Locale): 'he_IL' | 'en_GB' {
  return locale === 'he' ? 'he_IL' : 'en_GB';
}

/**
 * Prefixes a site-root path for the given locale. Hebrew is unprefixed, so this is the
 * identity for it; English gets `/en` in front, with `/` becoming `/en` rather than
 * `/en/` so no path ever gains a trailing slash it did not have.
 */
export function localePath(locale: Locale, path = '/'): string {
  const normalised = path.startsWith('/') ? path : `/${path}`;
  if (locale === defaultLocale) return normalised;
  return normalised === '/' ? '/en' : `/en${normalised}`;
}

/**
 * The same page in the other language, for the switcher.
 *
 * Takes the *unprefixed* path, which is what every caller has: a page knows which
 * route it is, not which prefix the request arrived under.
 */
export function alternateLocale(locale: Locale): Locale {
  return locale === 'he' ? 'en' : 'he';
}

/**
 * Strips a leading `/en` so a prefixed pathname can be mapped back onto the route it
 * actually is. Returns `/` rather than an empty string, which is what `localePath`
 * expects to be handed back.
 */
export function stripLocale(pathname: string): string {
  if (pathname === '/en') return '/';
  if (pathname.startsWith('/en/')) return pathname.slice('/en'.length);
  return pathname === '' ? '/' : pathname;
}

/** Reads the locale a pathname is being served under. */
export function localeFromPath(pathname: string): Locale {
  return pathname === '/en' || pathname.startsWith('/en/') ? 'en' : 'he';
}

/**
 * Every locale pointing at every other one, keyed the way Next.js `alternates`
 * expects, so a page declares its pair in one line instead of restating both.
 *
 * `x-default` is the third entry, and it is not a restatement of the Hebrew one.
 * `hreflang="he"` and `hreflang="en"` between them tell Google what to serve a Hebrew
 * or an English speaker; they say nothing about the Russian speaker, and Google's
 * documented fallback for an unmatched language is to choose from the set on its own.
 * Naming the Hebrew root makes that choice ours rather than whichever page happens to
 * rank that week.
 */
export function languageAlternates(path = '/'): Record<Locale | 'x-default', string> {
  return {
    he: localePath('he', path),
    en: localePath('en', path),
    'x-default': localePath(defaultLocale, path),
  };
}
