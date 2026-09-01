import type { MetadataRoute } from 'next';

import { indexableEntries } from '@/lib/seo';

/**
 * `/sitemap.xml` (§12).
 *
 * Eight URLs — four routes in two languages. The English half used to be missing while
 * every Hebrew page carried an `hreflang` pointing at it, which is the worst of both:
 * Google was told the translations exist and was never given a list of them to fetch.
 *
 * Each entry restates the whole `hreflang` set, including `x-default`. That is
 * deliberate duplication and it is what Google's own guidance asks for — the sitemap is
 * an independent signal from the page-level link tags, and a crawler that reaches the
 * English page first learns about the Hebrew one without having to parse it.
 *
 * No `lastModified`. The obvious thing to write there is `new Date()`, which would
 * stamp every page as freshly changed on every deploy — a claim that is false the
 * moment a deploy touches only the dashboard. Google discounts a sitemap whose dates it
 * learns not to trust, so an absent signal is worth more here than a fabricated one.
 *
 * `changeFrequency` and `priority` are omitted for a blunter reason: Google has stated
 * it ignores both.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  return indexableEntries().map((entry) => ({
    url: entry.url,
    alternates: { languages: entry.languages },
  }));
}
