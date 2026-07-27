import { clientEnv } from '@/lib/env.client';

/**
 * The canonical shape of the site for crawlers (§12).
 *
 * On the choice of origin: this module reads `NEXT_PUBLIC_SITE_URL` and deliberately
 * does *not* use `resolveRequestOrigin()`. The two answer different questions.
 * `resolveRequestOrigin` answers "where is this host standing right now", which is the
 * right source for an invitation link a host is about to paste into WhatsApp. A
 * canonical URL, a sitemap entry and a robots directive answer "which address is the
 * real one" — and on a Vercel preview deployment the honest answer is production, not
 * the preview host. Deriving these from request headers would publish preview origins
 * into search results and let a forged `x-forwarded-host` rewrite the canonical tag.
 */

/** Origin without a trailing slash, so `${SITE_ORIGIN}/privacy` never doubles up. */
export const SITE_ORIGIN = clientEnv.NEXT_PUBLIC_SITE_URL.replace(/\/+$/, '');

/**
 * Every route a search engine is welcome to index — the whole list, in one place, so
 * `robots.ts` and `sitemap.ts` cannot disagree about what is public.
 *
 * It is short by design. The product's entire surface beyond these three pages is
 * either an authenticated host screen or an invitation whose unguessable URL *is* its
 * access control (§4.2), and neither belongs in an index.
 */
export const INDEXABLE_PATHS = ['/', '/privacy', '/accessibility'] as const;

/**
 * Path prefixes closed to crawlers.
 *
 * `/e/` is the one that matters. An indexed invitation would defeat the unguessable
 * URL outright, which makes this line a security control rather than an SEO
 * preference — the same reason the invitation page also sends `noindex` in its
 * metadata. The two are not redundant: `Disallow` stops a crawler fetching the page
 * at all, and the meta tag catches any crawler that fetched it anyway.
 *
 * The authenticated routes are here for a quieter reason. They are unreachable
 * without a session and would only ever be indexed as a login screen, but a search
 * result pointing at `/dashboard` is a support ticket waiting to happen.
 */
export const DISALLOWED_PATHS = [
  '/e/',
  '/dashboard/',
  '/login',
  '/signup',
  '/forgot-password',
  '/reset-password',
  '/auth/',
] as const;

/** Absolute URL for a site-relative path. */
export function absoluteUrl(path: string): string {
  return `${SITE_ORIGIN}${path.startsWith('/') ? path : `/${path}`}`;
}
