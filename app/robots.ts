import type { MetadataRoute } from 'next';

import { DISALLOWED_PATHS, absoluteUrl } from '@/lib/seo';

/**
 * `/robots.txt` (§12).
 *
 * A single `Allow: /` carries the public side rather than a list naming `/privacy`
 * and `/accessibility` beside it. Those entries would be exactly redundant — `Allow`
 * is the default — and a redundant list is one that goes stale the first time a
 * public page is added and nobody thinks to update it. The `Disallow` block below is
 * the load-bearing half, and it is the half that is enumerated.
 *
 * A note on what this file does *not* buy. WhatsApp's link-preview fetcher does not
 * request robots.txt, so `Disallow: /e/` costs an invitation nothing on the channel
 * the product actually ships over. Facebook's crawler does respect it, so an
 * invitation pasted into Messenger will preview without its image. That is the
 * correct trade: an invitation is a private link that happens to be shared over
 * WhatsApp, and a crawler that honours robots.txt is precisely the crawler that
 * should not be holding one.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        // Spread into a mutable array: `MetadataRoute.Robots` types `disallow` as
        // `string | string[]`, and the shared constant is `readonly`.
        disallow: [...DISALLOWED_PATHS],
      },
    ],
    // No `host` directive. It is a Yandex extension that Google ignores, it expects a
    // bare hostname rather than the origin Next.js emits, and a malformed line in a
    // file this small is worse than an absent one.
    sitemap: absoluteUrl('/sitemap.xml'),
  };
}
