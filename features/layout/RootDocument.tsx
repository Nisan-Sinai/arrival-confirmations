import type { Metadata, Viewport } from 'next';
import { Assistant, Frank_Ruhl_Libre } from 'next/font/google';

import { getDictionary } from '@/config/dictionary';
import { assertNoPlaceholders } from '@/config/event.config';
import { AppLocaleProvider } from '@/features/i18n/AppLocaleProvider';
import { SiteFooter } from '@/features/layout/SiteFooter';
import {
  directionOf,
  languageAlternates,
  languageTag,
  localePath,
  openGraphLocale,
  type Locale,
} from '@/lib/i18n';
import { GOOGLE_SITE_VERIFICATION, SITE_ORIGIN } from '@/lib/seo';

import '@/app/globals.css';

/**
 * §0 and §15: refuse to serve production while a branding placeholder is still in
 * place. `assertNoPlaceholders` was written for this and had no caller anywhere in the
 * application, which made it a guarantee nobody was collecting on — `supportEmail` is
 * still `__REPLACE_ME__`, and without this the first person to notice would have been
 * a guest reading the privacy notice and finding no way to contact anyone.
 *
 * Called at module scope so it fails when the route tree is first loaded rather than
 * on some later request, and a no-op outside production so local work is unaffected.
 */
assertNoPlaceholders();

/**
 * Body face. Assistant is a Hebrew-first sans with a large x-height, which is what
 * keeps the form legible for the older guests §5 calls out.
 *
 * Both faces keep their Latin subset, which is what lets the same stylesheet serve the
 * English side without a second font load.
 */
const assistant = Assistant({
  variable: '--font-assistant',
  subsets: ['hebrew', 'latin'],
  display: 'swap',
  weight: ['400', '600', '700'],
});

/** Display face for the invitation headline — a Hebrew serif with real ceremony. */
const frankRuhl = Frank_Ruhl_Libre({
  variable: '--font-frank-ruhl',
  subsets: ['hebrew', 'latin'],
  display: 'swap',
  weight: ['400', '500', '700'],
});

/**
 * The document metadata for one locale.
 *
 * A factory rather than a constant: `title`, `description` and `og:locale` all differ
 * per language, and `alternates.languages` is what stops the two versions of a page
 * competing with each other in search results instead of pairing up.
 */
export function buildMetadata(locale: Locale): Metadata {
  const dictionary = getDictionary(locale);

  return {
    metadataBase: new URL(SITE_ORIGIN),
    title: {
      default: dictionary.site.name,
      template: `%s · ${dictionary.site.name}`,
    },
    description: dictionary.site.description,
    applicationName: dictionary.site.name,
    formatDetection: {
      telephone: false,
    },
    alternates: {
      canonical: localePath(locale, '/'),
      languages: languageAlternates('/'),
    },
    openGraph: {
      type: 'website',
      locale: openGraphLocale(locale),
      siteName: dictionary.site.name,
      title: dictionary.site.name,
      description: dictionary.site.description,
      url: localePath(locale, '/'),
    },
    twitter: { card: 'summary_large_image' },
    verification: { google: GOOGLE_SITE_VERIFICATION },
  };
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#5e1b28',
};

/**
 * The document shell, shared by both locales.
 *
 * `lang` and `dir` are set on the actual document, while `AppLocaleProvider` carries
 * the same locale into client components deeper in the app. This prevents shared
 * dashboard and RSVP components from silently falling back to Hebrew after navigation.
 */
export function RootDocument({
  locale,
  children,
}: Readonly<{ locale: Locale; children: React.ReactNode }>) {
  const dictionary = getDictionary(locale);

  return (
    <html
      lang={languageTag(locale)}
      dir={directionOf(locale)}
      className={`${assistant.variable} ${frankRuhl.variable} h-full`}
    >
      <body className="flex min-h-full flex-col">
        <AppLocaleProvider locale={locale}>
          <a
            href="#main"
            className="focus-visible:bg-primary focus-visible:text-primary-foreground sr-only focus-visible:not-sr-only focus-visible:absolute focus-visible:top-4 focus-visible:start-4 focus-visible:z-50 focus-visible:rounded-md focus-visible:px-4 focus-visible:py-2"
          >
            {dictionary.a11y.skipToContent}
          </a>
          {children}
          <SiteFooter locale={locale} />
        </AppLocaleProvider>
      </body>
    </html>
  );
}
