import { socialImage } from '@/lib/social-image';
import type { Metadata } from 'next';
import Link from 'next/link';

import { buttonClass } from '@/components/ui/button';
import { Container, Section } from '@/components/ui/layout';
import { getDictionary } from '@/config/dictionary';
import { guideContent } from '@/features/guide/content';
import { topicPaths, topics, type TopicPath } from '@/features/guide/topics';
import { SiteHeader } from '@/features/layout/SiteHeader';
import {
  languageAlternates,
  languageTag,
  localePath,
  openGraphLocale,
  type Locale,
} from '@/lib/i18n';
import { absoluteUrl, PUBLISHER_URL } from '@/lib/seo';

type GuidePath = '/guide' | TopicPath;

export function buildGuideMetadata(locale: Locale, path: GuidePath = '/guide'): Metadata {
  const content = path === '/guide' ? guideContent[locale] : topics[path][locale];
  return {
    title: content.title,
    description: content.description,
    alternates: {
      canonical: localePath(locale, path),
      languages: languageAlternates(path),
    },
    openGraph: {
      images: [socialImage(locale)],
      type: 'website',
      title: content.title,
      description: content.description,
      siteName: getDictionary(locale).site.name,
      locale: openGraphLocale(locale),
      url: absoluteUrl(localePath(locale, path)),
    },
    twitter: {
      images: [socialImage(locale)],
      card: 'summary_large_image',
      title: content.title,
      description: content.description,
    },
  };
}

export function GuidePage({ locale, path = '/guide' }: { locale: Locale; path?: GuidePath }) {
  const guide = guideContent[locale];
  const content = path === '/guide' ? guide : topics[path][locale];
  const { footer, header } = getDictionary(locale);
  const homeUrl = absoluteUrl(localePath(locale, '/'));
  const url = absoluteUrl(localePath(locale, path));
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
          { '@type': 'ListItem', position: 1, name: guide.homeLink, item: homeUrl },
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
      <SiteHeader locale={locale} languageSwitchPath={path} showLanguageSwitch />
      <main id="main" className="flex flex-1 flex-col">
        <Section>
          <Container>
            <article className="mx-auto max-w-3xl">
              <nav aria-label={locale === 'he' ? 'נתיב ניווט' : 'Breadcrumb'}>
                <Link
                  className="text-primary inline-flex min-h-11 items-center underline underline-offset-4"
                  href={localePath(locale, '/')}
                >
                  {guide.homeLink}
                </Link>
              </nav>
              <h1 className="text-h1 text-primary mt-5 font-bold">{content.title}</h1>
              <p className="text-lead text-muted-foreground mt-6 leading-relaxed">
                {content.intro}
              </p>
              <Link
                href={localePath(locale, '/signup')}
                className={buttonClass({ className: 'mt-6' })}
              >
                {header.signup}
              </Link>
              {content.sections.map((section) => (
                <section key={section.title} className="mt-10">
                  <h2 className="text-h3 text-primary font-semibold">{section.title}</h2>
                  <p className="text-foreground mt-4 leading-relaxed">{section.body}</p>
                </section>
              ))}
              <section className="mt-10" aria-labelledby="related-rsvp-guides">
                <h2 id="related-rsvp-guides" className="text-h3 text-primary font-semibold">
                  {locale === 'he' ? 'עוד מדריכים לאישורי הגעה' : 'More RSVP guides'}
                </h2>
                <GuideLinks locale={locale} currentPath={path} />
              </section>
              <div className="mt-10 flex flex-col gap-3">
                <Link
                  className="text-primary inline-flex min-h-11 items-center underline underline-offset-4"
                  href={localePath(locale, '/pricing')}
                >
                  {guide.pricingLink}
                </Link>
                <Link
                  className="text-primary inline-flex min-h-11 items-center underline underline-offset-4"
                  href={localePath(locale, '/privacy')}
                >
                  {guide.privacyLink}
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

export function GuideLinks({ locale, currentPath }: { locale: Locale; currentPath?: GuidePath }) {
  const paths = ['/guide', ...topicPaths] as const;
  return (
    <ul className="mt-3">
      {paths
        .filter((path) => path !== currentPath)
        .map((path) => (
          <li key={path}>
            <Link
              href={localePath(locale, path)}
              className="text-primary inline-flex min-h-11 items-center underline underline-offset-4"
            >
              {path === '/guide' ? guideContent[locale].title : topics[path][locale].title}
            </Link>
          </li>
        ))}
    </ul>
  );
}
