import type { MetadataRoute } from 'next';

import { INDEXABLE_PATHS, absoluteUrl } from '@/lib/seo';

/**
 * `/sitemap.xml` (§12).
 *
 * Three URLs, and no `lastModified`. The obvious thing to write there is
 * `new Date()`, which would stamp every page as freshly changed on every deploy —
 * a claim that is false the moment a deploy touches only the dashboard. Google
 * discounts a sitemap whose dates it learns not to trust, so an absent signal is
 * worth more here than a fabricated one.
 *
 * `changeFrequency` and `priority` are omitted for a blunter reason: Google has
 * stated it ignores both.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  return INDEXABLE_PATHS.map((path) => ({ url: absoluteUrl(path) }));
}
