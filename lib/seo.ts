import { clientEnv } from '@/lib/env.client';
import { localePath, locales } from '@/lib/i18n';

/** Origin without a trailing slash, so joined paths never double up. */
export const SITE_ORIGIN = clientEnv.NEXT_PUBLIC_SITE_URL.replace(/\/+$/, '');

/** Public pages that carry no personal data and are useful in search results. */
export const INDEXABLE_PATHS = ['/', '/pricing', '/privacy', '/accessibility'] as const;

/** Private, authenticated or invitation paths that crawlers must never index. */
export const DISALLOWED_PATHS = [
  '/e/',
  '/dashboard/',
  '/admin/',
  '/login',
  '/signup',
  '/forgot-password',
  '/reset-password',
  '/auth/',
] as const;

export const GOOGLE_SITE_VERIFICATION = 'E28NaBeiOIjkaklYu2ZeTrE9hEni9yBGcYeyGkrZ7MQ';

/**
 * The studio's own site, published as `sameAs` on the `Organization` node.
 *
 * This is the one link that tells Google the publisher of an RSVP product and the web
 * studio of the same name are a single entity. Without it Google resolved the name
 * against an unrelated metalworking business and stated in its own summary that the
 * studio "is not connected to RSVP systems" — a claim shown above the site's own result.
 *
 * Kept here rather than in a dictionary because it is an identity claim, not copy: it
 * does not translate, and it must stay true. Remove it before it 404s.
 */
export const PUBLISHER_URL = 'https://nisan-sinai-technologies.vercel.app';

export function absoluteUrl(path: string): string {
  return `${SITE_ORIGIN}${path.startsWith('/') ? path : `/${path}`}`;
}

/**
 * Every locale's spelling of a route, in locale order.
 *
 * Both lists above name *routes*, not URLs: `/login` is the Hebrew spelling of a page
 * that is also served at `/en/login`. Writing the prefixed forms out by hand is what
 * produced the bug this exists to close — `robots.txt` disallowed `/login` and left
 * `/en/login` open to crawlers for as long as the English tree has existed, because a
 * `Disallow` is a prefix match and `/en/login` does not start with `/login`.
 *
 * Deriving the prefixes instead means the next language, or the next private route,
 * cannot reintroduce it: there is no second list to forget.
 */
export function localeVariants(path: string): string[] {
  return locales.map((locale) => localePath(locale, path));
}

/**
 * The `Disallow` set, every locale included.
 *
 * Directory paths keep their trailing slash through `localePath`, which matters: a
 * `Disallow: /en/dashboard/` that arrived as `/en/dashboard` would also match a future
 * `/en/dashboard-demo`, and a rule that over-blocks is as wrong as one that under-blocks.
 */
export function disallowedPaths(): string[] {
  return DISALLOWED_PATHS.flatMap(localeVariants);
}

/** Canonical URL plus its `hreflang` set, for one indexable route. */
export interface IndexableEntry {
  readonly url: string;
  readonly languages: Record<string, string>;
}

/**
 * The crawlable surface as absolute URLs, one entry per locale per route.
 *
 * The English pages were absent from the sitemap while `hreflang` pointed at them from
 * every Hebrew page — Google was told the translations existed and never handed a list
 * of them. Each entry carries the full alternates set, which is the form Google prefers
 * over per-page link tags alone.
 */
export function indexableEntries(): IndexableEntry[] {
  return INDEXABLE_PATHS.flatMap((path) => {
    const languages: Record<string, string> = {
      ...Object.fromEntries(
        locales.map((locale) => [locale, absoluteUrl(localePath(locale, path))]),
      ),
      'x-default': absoluteUrl(localePath('he', path)),
    };
    return locales.map((locale) => ({ url: absoluteUrl(localePath(locale, path)), languages }));
  });
}
