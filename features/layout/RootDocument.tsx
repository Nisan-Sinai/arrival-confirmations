import type { Metadata, Viewport } from 'next';
import { Assistant, Frank_Ruhl_Libre } from 'next/font/google';

import { getDictionary } from '@/config/dictionary';
import { assertNoPlaceholders } from '@/config/event.config';
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
    /**
     * §12. Every relative URL in a `Metadata` object — canonical tags, `og:image`,
     * `og:url` — is resolved against this. Without it Next.js emits the image path
     * relative and warns, and a preview crawler is handed a URL it cannot fetch, which
     * is the difference between a share card and a bare grey rectangle.
     */
    metadataBase: new URL(SITE_ORIGIN),
    title: {
      default: dictionary.site.name,
      template: `%s · ${dictionary.site.name}`,
    },
    description: dictionary.site.description,
    applicationName: dictionary.site.name,
    formatDetection: {
      // A phone number inside the invitation copy should not become a tap-to-call link
      // mid-sentence; the contact block links deliberately instead.
      telephone: false,
    },
    alternates: {
      canonical: localePath(locale, '/'),
      languages: languageAlternates('/'),
    },
    /**
     * Defaults, not the last word: `openGraph` is replaced wholesale by any route that
     * declares its own, which is why the invitation page restates `type` and `locale`.
     * The image is the exception — `app/opengraph-image.tsx` is picked up by file
     * convention and does not need naming here.
     */
    openGraph: {
      type: 'website',
      locale: openGraphLocale(locale),
      siteName: dictionary.site.name,
      title: dictionary.site.name,
      description: dictionary.site.description,
      url: localePath(locale, '/'),
    },
    // Read by more preview clients than Twitter's own, and the only thing it changes is
    // whether the image renders full-bleed or as a thumbnail beside the text.
    twitter: { card: 'summary_large_image' },
    /**
     * Ownership proof for Google Search Console — see the note on the constant for why
     * it is committed rather than configured.
     *
     * This is the tag that actually gets the site into Google. Nothing else in this file
     * does: robots.txt and a sitemap describe a site Google already knows about, and
     * Google will not discover a brand-new domain with no inbound links on its own.
     * Verifying here and submitting `/sitemap.xml` is what starts the clock.
     */
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
 * `lang` and `dir` are the reason each locale needs a root layout of its own: Next.js
 * only lets the outermost layout emit `<html>`, so one shared root would have to pick a
 * single language for every page on the site. A screen reader handed English prose
 * under `lang="he"` announces it in the wrong voice, and the bidi algorithm lays it out
 * from the wrong side.
 *
 * The product name now comes from the dictionary rather than `appConfig`, which holds
 * a single Hebrew string. The document title is the first thing a reader sees, and it
 * should not be the one place the language fails to follow them.
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
        {/*
          §9: skip link, first in the tab order, visible only once focused.

          `top-20`, not `top-4`. At `top-4` the focused link landed inside the header at
          the inline-start corner — which in a right-to-left document is exactly where the
          brand mark sits — so the first thing a keyboard user did, on the first Tab of the
          page, was put two interactive targets in the same pixels. axe reports it as a
          WCAG 2.2 SC 2.5.8 failure against the logo, and it is a real one: the two are
          genuinely indistinguishable to a pointer.

          Below the header it overlaps a heading or a paragraph instead. Those are not
          targets, so nothing competes, and the link is still the first thing visible.
          `start-4` rather than `right-4` so it follows the writing direction instead of
          assuming one.
        */}
        <a
          href="#main"
          className="focus-visible:bg-primary focus-visible:text-primary-foreground sr-only focus-visible:not-sr-only focus-visible:absolute focus-visible:start-4 focus-visible:top-20 focus-visible:z-50 focus-visible:rounded-md focus-visible:px-4 focus-visible:py-2 focus-visible:shadow-lg"
        >
          {dictionary.a11y.skipToContent}
        </a>
        {children}
        <SiteFooter locale={locale} />
      </body>
    </html>
  );
}
