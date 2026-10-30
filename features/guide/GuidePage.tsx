import type { Metadata } from 'next';
import Link from 'next/link';

import { Container, Section } from '@/components/ui/layout';
import { getDictionary } from '@/config/dictionary';
import { guideContent } from '@/features/guide/content';
import { SiteHeader } from '@/features/layout/SiteHeader';
import {
  languageAlternates,
  languageTag,
  localePath,
  openGraphLocale,
  type Locale,
} from '@/lib/i18n';
import { absoluteUrl, PUBLISHER_URL } from '@/lib/seo';

export function buildGuideMetadata(locale: Locale): Metadata {
  const content = guideContent[locale];
  return {
    title: content.title,
    description: content.description,
    alternates: {
      canonical: localePath(locale, '/guide'),
      languages: languageAlternates('/guide'),
    },
    openGraph: {
      type: 'website',
      title: content.title,
      description: content.description,
      siteName: getDictionary(locale).site.name,
      locale: openGraphLocale(locale),
      url: absoluteUrl(localePath(locale, '/guide')),
    },
    twitter: {
      card: 'summary_large_image',
      title: content.title,
      description: content.description,
    },
  };
}

export function GuidePage({ locale }: { locale: Locale }) {
  const content = guideContent[locale];
  const { footer } = getDictionary(locale);
  const homeUrl = absoluteUrl(localePath(locale, '/'));
  const url = absoluteUrl(localePath(locale, '/guide'));
  const graph = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebPage',
        '@id': `${url}#webpage`,
        url,
        name: content.title,
        description: content.description,
        inLanguage: languageTag(locale),
        publisher: {
          '@type': 'Organization',
          '@id': `${PUBLISHER_URL}/#business`,
          name: footer.builderName,
          url: PUBLISHER_URL,
        },
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: content.homeLink, item: homeUrl },
          { '@type': 'ListItem', position: 2, name: content.title, item: url },
        ],
      },
    ],
  };
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(graph).replace(/</g, '\\u003c') }}
      />
      <SiteHeader locale={locale} showLanguageSwitch />
      <main id="main" className="flex flex-1 flex-col">
        <Section>
          <Container>
            <article className="mx-auto max-w-3xl">
              <nav aria-label={locale === 'he' ? 'נתיב ניווט' : 'Breadcrumb'}>
                <Link
                  className="text-primary inline-flex min-h-11 items-center underline underline-offset-4"
                  href={localePath(locale, '/')}
                >
                  {content.homeLink}
                </Link>
              </nav>
              <h1 className="text-h1 text-primary mt-5 font-bold">{content.title}</h1>
              <p className="text-lead text-muted-foreground mt-6 leading-relaxed">
                {content.intro}
              </p>
              {content.sections.map((section) => (
                <section key={section.title} className="mt-10">
                  <h2 className="text-h3 text-primary font-semibold">{section.title}</h2>
                  <p className="text-foreground mt-4 leading-relaxed">{section.body}</p>
                </section>
              ))}
              <div className="mt-10 flex flex-col gap-3">
                <Link
                  className="text-primary inline-flex min-h-11 items-center underline underline-offset-4"
                  href={localePath(locale, '/pricing')}
                >
                  {content.pricingLink}
                </Link>
                <Link
                  className="text-primary inline-flex min-h-11 items-center underline underline-offset-4"
                  href={localePath(locale, '/privacy')}
                >
                  {content.privacyLink}
                </Link>
                <a
                  className="text-primary inline-flex min-h-11 items-center underline underline-offset-4"
                  href={PUBLISHER_URL}
                >
                  {footer.builderName}
                </a>
              </div>
            </article>
          </Container>
        </Section>
      </main>
    </>
  );
}
