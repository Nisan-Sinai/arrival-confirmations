import type { MetadataRoute } from 'next';

import { getDictionary } from '@/config/dictionary';
import { defaultLocale, directionOf, languageTag } from '@/lib/i18n';

/**
 * The web app manifest.
 *
 * A host manages an event from their phone for weeks: checking who replied in a queue,
 * sending a reminder from the car park. With a manifest the browser offers "add to home
 * screen", and the dashboard then opens like an app — its own icon, no address bar, the
 * brand's colour in the status bar — instead of being a tab to find again each time.
 *
 * `start_url` is the dashboard rather than the marketing page: whoever installs this is
 * already a customer. A signed-out launch is redirected to the sign-in page by the same
 * guard that protects the dashboard everywhere else, so there is nothing extra to secure.
 *
 * Hebrew, because one manifest serves the whole origin and the signed-in product is
 * Hebrew throughout.
 */
export default function manifest(): MetadataRoute.Manifest {
  const { site } = getDictionary(defaultLocale);

  return {
    name: site.name,
    short_name: site.name,
    description: site.description,
    lang: languageTag(defaultLocale),
    dir: directionOf(defaultLocale),
    start_url: '/dashboard',
    scope: '/',
    display: 'standalone',
    // The paper ground and the wine of the brand — the same two the document declares.
    background_color: '#fcf8f4',
    theme_color: '#5e1b28',
    icons: [
      { src: '/icon.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/apple-icon.png', sizes: '180x180', type: 'image/png', purpose: 'any' },
    ],
  };
}
