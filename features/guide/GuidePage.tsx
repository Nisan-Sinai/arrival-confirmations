import { socialImage } from '@/lib/social-image';
import type { Metadata } from 'next';
import Link from 'next/link';

import { buttonClass } from '@/components/ui/button';
import { Icon } from '@/components/ui/icons';
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

const GUIDE_LABELS: Record<
  Locale,
  {
    readonly breadcrumb: string;
    readonly eyebrow: string;
    readonly contents: string;
    readonly more: string;
    /** `{minutes}` is the estimate from `readingMinutes`. */
    readonly readingTime: string;
    /** The one-minute form. Hebrew does not say "about 1 minutes". */
    readonly readingTimeOne: string;
    readonly ctaTitle: string;
    readonly ctaBody: string;
  }
> = {
  he: {
    breadcrumb: 'נתיב ניווט',
    eyebrow: 'מדריך',
    contents: 'בעמוד הזה',
    more: 'עוד מדריכים לאישורי הגעה',
    readingTime: 'כ-{minutes} דקות קריאה',
    readingTimeOne: 'כדקת קריאה',
    ctaTitle: 'מוכנים לנסות עם האירוע שלכם?',
    ctaBody: 'יוצרים אירוע, מעצבים את ההזמנה ובודקים עם עד 10 אישורי הגעה — בחינם.',
  },
  en: {
    breadcrumb: 'Breadcrumb',
    eyebrow: 'Guide',
    contents: 'On this page',
    more: 'More RSVP guides',
    readingTime: 'About a {minutes}-minute read',
    readingTimeOne: 'About a one-minute read',
    ctaTitle: 'Ready to try it with your own event?',
    ctaBody: 'Create an event, design the invitation and test it with up to 10 replies — free.',
  },
};

/**
 * A reading-time estimate, at roughly 200 words a minute and never less than one.
 *
 * Counted from the text the page actually renders, so it cannot drift from the content
 * the way a number typed into the copy would.
 */
function readingMinutes(intro: string, sections: readonly { title: string; body: string }[]) {
  const words = [intro, ...sections.flatMap((section) => [section.title, section.body])]
    .join(' ')
    .split(/\s+/)
    .filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

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
  const labels = GUIDE_LABELS[locale];
  // Stable anchors for the table of contents. Numbered rather than derived from the
  // heading text: a Hebrew title makes an unreadable fragment once it is percent-encoded.
  const sectionId = (index: number) => `section-${index + 1}`;
  const minutes = readingMinutes(content.intro, content.sections);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(graph).replace(/</g, '\\u003c') }}
      />
      <SiteHeader locale={locale} languageSwitchPath={path} showLanguageSwitch />
      <main id="main" className="flex flex-1 flex-col">
        {/*
          The opening band. These pages were a single column of body text under a plain
          link — accurate, and indistinguishable from a page that had failed to load its
          styles. The band gives the article a start: where you are, what it is about,
          and the one action it leads to.
        */}
        <div className="bg-surface-sand/70 border-border/60 relative overflow-clip border-b">
          <div aria-hidden="true" className="hero-glow opacity-40" />
          <Container className="relative py-12 sm:py-16">
            <div className="mx-auto max-w-3xl">
              <nav aria-label={labels.breadcrumb}>
                <ol className="text-muted-foreground flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                  <li>
                    <Link
                      className="text-primary inline-flex min-h-11 items-center underline underline-offset-4"
                      href={localePath(locale, '/')}
                    >
                      {guide.homeLink}
                    </Link>
                  </li>
                  <li aria-hidden="true">
                    <Icon name="chevron-forward" className="size-3.5" />
                  </li>
                  <li aria-current="page" className="font-medium">
                    {labels.eyebrow}
                  </li>
                </ol>
              </nav>
              <h1 className="text-h1 text-primary mt-4 font-bold">{content.title}</h1>
              <p className="text-lead text-muted-foreground mt-5 leading-relaxed">
                {content.intro}
              </p>
              <div className="mt-7 flex flex-wrap items-center gap-3">
                <Link href={localePath(locale, '/signup')} className={buttonClass()}>
                  {header.signup}
                  <Icon name="arrow-forward" className="size-4" />
                </Link>
                <span className="text-muted-foreground inline-flex items-center gap-1.5 text-sm">
                  <Icon name="clock" className="text-accent-strong size-4" />
                  {minutes === 1
                    ? labels.readingTimeOne
                    : labels.readingTime.replace('{minutes}', String(minutes))}
                </span>
              </div>
            </div>
          </Container>
        </div>

        <Section spacing="sm">
          <Container>
            <article className="mx-auto grid max-w-5xl gap-10 lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-14">
              {/*
                The contents, beside the text once there is room and above it before
                that. A `<nav>` with a label rather than a heading: the page's outline is
                its questions, and "on this page" is not one of them.
              */}
              <nav
                aria-label={labels.contents}
                className="border-border bg-card shadow-paper rounded-2xl border p-5 lg:sticky lg:top-24 lg:self-start"
              >
                <p className="text-eyebrow text-accent-strong font-semibold">{labels.contents}</p>
                <ol className="mt-3 space-y-1">
                  {content.sections.map((section, index) => (
                    <li key={section.title}>
                      <a
                        href={`#${sectionId(index)}`}
                        className="text-muted-foreground hover:text-primary hover:bg-secondary/50 flex min-h-11 items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm leading-snug transition-colors duration-[--duration-fast]"
                      >
                        <span
                          aria-hidden="true"
                          className="text-accent-strong w-5 shrink-0 text-xs font-bold tabular-nums"
                        >
                          {String(index + 1).padStart(2, '0')}
                        </span>
                        {section.title}
                      </a>
                    </li>
                  ))}
                </ol>
              </nav>

              <div className="min-w-0">
                <div className="space-y-5">
                  {content.sections.map((section, index) => (
                    <section
                      key={section.title}
                      id={sectionId(index)}
                      className="border-border bg-card shadow-paper scroll-mt-24 rounded-2xl border p-6 sm:p-8"
                    >
                      <div className="flex items-start gap-4">
                        <span
                          aria-hidden="true"
                          className="border-accent-strong/30 bg-accent-soft/50 text-accent-strong flex size-10 shrink-0 items-center justify-center rounded-full border text-sm font-bold tabular-nums"
                        >
                          {String(index + 1).padStart(2, '0')}
                        </span>
                        <h2 className="text-h3 text-primary pt-1 font-semibold">{section.title}</h2>
                      </div>
                      <p className="text-foreground mt-4 leading-[1.85]">{section.body}</p>
                    </section>
                  ))}
                </div>

                <section className="mt-12" aria-labelledby="related-rsvp-guides">
                  <h2 id="related-rsvp-guides" className="text-h3 text-primary font-semibold">
                    {labels.more}
                  </h2>
                  <GuideLinks locale={locale} currentPath={path} />
                </section>

                <ul className="mt-8 grid gap-3 sm:grid-cols-3">
                  {(
                    [
                      { path: '/pricing', label: guide.pricingLink, icon: 'credit-card' },
                      { path: '/privacy', label: guide.privacyLink, icon: 'shield' },
                    ] as const
                  ).map((item) => (
                    <li key={item.path}>
                      <Link
                        href={localePath(locale, item.path)}
                        className="border-border bg-card/60 text-primary hover:border-accent-strong/40 hover:bg-card flex h-full min-h-14 items-center gap-3 rounded-xl border px-4 py-3 text-sm font-semibold transition-colors duration-[--duration-fast]"
                      >
                        <Icon name={item.icon} className="text-accent-strong size-5" />
                        {item.label}
                      </Link>
                    </li>
                  ))}
                  <li>
                    <a
                      href={PUBLISHER_URL}
                      className="border-border bg-card/60 text-primary hover:border-accent-strong/40 hover:bg-card flex h-full min-h-14 items-center gap-3 rounded-xl border px-4 py-3 text-sm font-semibold transition-colors duration-[--duration-fast]"
                    >
                      <Icon name="globe" className="text-accent-strong size-5" />
                      {footer.builderName}
                    </a>
                  </li>
                </ul>

                {/* The page ends on the action it has been explaining how to take. */}
                <div className="bg-surface-ink text-primary-foreground mt-12 flex flex-col items-start gap-5 rounded-3xl border border-white/10 p-7 sm:flex-row sm:items-center sm:justify-between sm:p-9">
                  <div>
                    <p className="font-[family-name:var(--font-display)] text-2xl font-bold">
                      {labels.ctaTitle}
                    </p>
                    <p className="mt-2 text-sm leading-relaxed text-white/75">{labels.ctaBody}</p>
                  </div>
                  <Link
                    href={localePath(locale, '/signup')}
                    className={buttonClass({
                      variant: 'gold',
                      className:
                        'shrink-0 border-[#e6c390] bg-[#e9c892] text-[#381c26] hover:bg-[#f2d9ad]',
                    })}
                  >
                    {header.signup}
                    <Icon name="arrow-forward" className="size-4" />
                  </Link>
                </div>
              </div>
            </article>
          </Container>
        </Section>
      </main>
    </>
  );
}

/**
 * The guides as a row of cards.
 *
 * These were four bare underlined links, on the landing page and at the foot of every
 * guide. Each link's accessible name is still exactly the guide's title — the arrow and
 * the icon are decoration — so nothing that looks a guide up by name has to change.
 */
export function GuideLinks({ locale, currentPath }: { locale: Locale; currentPath?: GuidePath }) {
  const paths = ['/guide', ...topicPaths] as const;
  return (
    <ul className="mt-4 grid gap-3 sm:grid-cols-2">
      {paths
        .filter((path) => path !== currentPath)
        .map((path) => (
          <li key={path}>
            <Link
              href={localePath(locale, path)}
              className="group border-border bg-card shadow-paper text-primary hover:border-accent-strong/40 hover:shadow-raised flex h-full min-h-16 items-center gap-3 rounded-2xl border px-4 py-3 font-semibold transition-[border-color,box-shadow] duration-[--duration-fast]"
            >
              <span
                aria-hidden="true"
                className="bg-accent-soft/60 text-accent-strong flex size-9 shrink-0 items-center justify-center rounded-xl"
              >
                <Icon name="book" className="size-5" />
              </span>
              <span className="min-w-0 flex-1 leading-snug">
                {path === '/guide' ? guideContent[locale].title : topics[path][locale].title}
              </span>
              <Icon
                name="arrow-forward"
                className="text-accent-strong size-4 opacity-60 transition-opacity duration-[--duration-fast] group-hover:opacity-100"
              />
            </Link>
          </li>
        ))}
    </ul>
  );
}
