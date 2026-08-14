import type { Metadata } from 'next';
import Link from 'next/link';

import { getPlanCatalog } from '@/app/_lib/plans';
import { buttonClass } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Container, Rule } from '@/components/ui/layout';
import { getDictionary } from '@/config/dictionary';
import { AuthFragmentNotice } from '@/features/auth/AuthFragmentNotice';
import { RsvpFlowSteps } from '@/features/landing/RsvpFlowSteps';
import { SiteHeader } from '@/features/layout/SiteHeader';
import { PricingCards } from '@/features/pricing/PricingCards';
import {
  languageAlternates,
  languageTag,
  localePath,
  openGraphLocale,
  type Locale,
} from '@/lib/i18n';
import { SITE_ORIGIN } from '@/lib/seo';

/**
 * The marketing home page, shared by both locales (§12).
 *
 * The Hebrew page at the root and the English page under `/en` are the same tree; only
 * the dictionary and the document direction differ. Keeping one component is what stops
 * a change to the funnel landing on one language and not the other.
 */

/** Page metadata for one locale, pairing the two languages with `hreflang`. */
export function buildLandingMetadata(locale: Locale): Metadata {
  const { landing, site } = getDictionary(locale);
  const path = localePath(locale, '/');

  return {
    title: { absolute: landing.meta.title },
    description: landing.meta.description,
    alternates: {
      canonical: path,
      languages: languageAlternates('/'),
    },
    openGraph: {
      type: 'website',
      locale: openGraphLocale(locale),
      siteName: site.name,
      title: landing.meta.ogTitle,
      description: landing.meta.ogDescription,
      url: path,
    },
  };
}

/** The `application/ld+json` graph, built from the dictionary and the plan catalogue. */
function structuredData(locale: Locale) {
  const { landing, site } = getDictionary(locale);
  const tag = languageTag(locale);
  const paidPlans = getPlanCatalog(locale).filter((plan) => plan.code !== 'trial');

  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebApplication',
        name: site.name,
        description: site.description,
        url: SITE_ORIGIN,
        applicationCategory: 'LifestyleApplication',
        operatingSystem: 'Web',
        inLanguage: tag,
        isAccessibleForFree: true,
        offers: paidPlans.map((plan) => ({
          '@type': 'Offer',
          name: plan.name,
          price: String(Math.round(plan.priceAgorot / 100)),
          priceCurrency: 'ILS',
        })),
      },
      {
        '@type': 'FAQPage',
        inLanguage: tag,
        mainEntity: landing.faq.items.map((item) => ({
          '@type': 'Question',
          name: item.question,
          acceptedAnswer: { '@type': 'Answer', text: item.answer },
        })),
      },
    ],
  };
}

export function LandingPage({ locale }: { locale: Locale }) {
  const { landing } = getDictionary(locale);
  const { hero, invitationPreview: preview, benefits, plans, faq } = landing;
  const countdown: readonly [string, string][] = [
    ['42', preview.countdownDays],
    ['06', preview.countdownHours],
    ['18', preview.countdownMinutes],
  ];

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData(locale)).replace(/</g, '\\u003c'),
        }}
      />
      <SiteHeader locale={locale} showLanguageSwitch />
      <main id="main" className="flex flex-1 flex-col">
        <div className="px-5 pt-5 empty:hidden">
          <AuthFragmentNotice locale={locale} />
        </div>

        <section className="from-secondary/45 relative overflow-hidden bg-gradient-to-b to-transparent py-16 sm:py-24">
          <Container width="wide">
            <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr]">
              <div className="text-center lg:text-start">
                <p className="text-eyebrow text-accent-strong font-semibold">{hero.eyebrow}</p>
                <h1 className="text-display text-primary mt-5 font-bold">
                  {hero.titleLead}
                  <span className="text-accent-strong block">{hero.titleAccent}</span>
                </h1>
                <p className="text-lead text-muted-foreground mt-6 max-w-2xl leading-relaxed lg:mx-0">
                  {hero.lead}
                </p>
                <div className="mt-9 flex flex-wrap justify-center gap-3 lg:justify-start">
                  <Link
                    href={localePath(locale, '/signup')}
                    className={buttonClass({ size: 'lg' })}
                  >
                    {hero.ctaPrimary}
                  </Link>
                  <Link
                    href={localePath(locale, '/pricing')}
                    className={buttonClass({ variant: 'outline', size: 'lg' })}
                  >
                    {hero.ctaSecondary}
                  </Link>
                </div>
                <ul className="text-muted-foreground mt-8 flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm lg:justify-start">
                  {hero.facts.map((fact) => (
                    <li key={fact} className="flex items-center gap-2">
                      <span aria-hidden="true" className="bg-accent-strong size-1.5 rounded-full" />
                      {fact}
                    </li>
                  ))}
                </ul>
              </div>

              <div aria-hidden="true" className="animate-rise relative mx-auto w-full max-w-sm">
                <div className="border-accent/60 bg-card shadow-lifted rotate-[-1.5deg] rounded-2xl border-2 p-2.5">
                  <div className="border-accent/35 from-secondary/25 rounded-xl border bg-gradient-to-b via-white/90 to-white/90 px-6 py-9 text-center">
                    <p className="text-muted-foreground text-xs">{preview.blessing}</p>
                    <p className="text-foreground mt-5 text-sm leading-relaxed">
                      {preview.introFirstLine}
                      <br />
                      {preview.introSecondLine}
                    </p>
                    <p className="text-primary mt-4 font-[family-name:var(--font-display)] text-3xl font-bold">
                      {preview.occasion}
                    </p>
                    <Rule className="my-6" />
                    <div className="text-primary flex justify-center gap-5 text-xs font-semibold">
                      {[
                        { k: preview.dateLabel, v: preview.dateValue },
                        { k: preview.timeLabel, v: preview.timeValue },
                        { k: preview.placeLabel, v: preview.placeValue },
                      ].map((cell) => (
                        <div key={cell.k}>
                          <span className="text-muted-foreground block font-normal">{cell.k}</span>
                          {cell.v}
                        </div>
                      ))}
                    </div>
                    <Rule className="my-6" />
                    <div className="flex justify-center gap-2" dir="ltr">
                      {countdown.map(([n, l]) => (
                        <div
                          key={l}
                          className="border-accent/40 from-secondary/40 min-w-12 rounded-lg border bg-gradient-to-b to-white/60 py-1.5"
                        >
                          <span className="text-primary block font-[family-name:var(--font-display)] text-lg leading-none font-bold">
                            {n}
                          </span>
                          <span className="text-muted-foreground text-[10px]">{l}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="border-border bg-card/85 shadow-raised absolute start-0 -bottom-5 rounded-xl border px-4 py-2.5 backdrop-blur-sm">
                  <p className="text-muted-foreground text-[11px]">{preview.captionLead}</p>
                  <p className="text-primary text-sm font-semibold">{preview.captionAccent}</p>
                </div>
              </div>
            </div>
          </Container>
        </section>

        <RsvpFlowSteps locale={locale} />

        <section className="py-16 sm:py-20">
          <Container width="wide">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-eyebrow text-accent-strong font-semibold">{benefits.eyebrow}</p>
              <h2 className="text-h1 text-primary mt-3 font-bold">{benefits.title}</h2>
            </div>
            <div className="mt-10 grid gap-5 md:grid-cols-3">
              {benefits.items.map((benefit) => (
                <Card key={benefit.title} padding="lg">
                  <h3 className="text-h3 text-primary font-semibold">{benefit.title}</h3>
                  <p className="text-muted-foreground mt-3 leading-relaxed">{benefit.body}</p>
                </Card>
              ))}
            </div>
          </Container>
        </section>

        <section className="bg-secondary/25 py-16 sm:py-20">
          <Container width="wide">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-eyebrow text-accent-strong font-semibold">{plans.eyebrow}</p>
              <h2 className="text-h1 text-primary mt-3 font-bold">{plans.title}</h2>
              <p className="text-muted-foreground mt-4 leading-relaxed">{plans.lead}</p>
            </div>
            <div className="mt-11">
              <PricingCards locale={locale} />
            </div>
          </Container>
        </section>

        <section className="py-16 sm:py-20">
          <Container>
            <div className="mx-auto max-w-3xl">
              <p className="text-eyebrow text-accent-strong text-center font-semibold">
                {faq.eyebrow}
              </p>
              <h2 className="text-h1 text-primary mt-3 text-center font-bold">{faq.title}</h2>
              <div className="mt-9 space-y-3">
                {faq.items.map((item) => (
                  <details
                    key={item.question}
                    className="border-border bg-card rounded-xl border px-5"
                  >
                    <summary className="text-primary cursor-pointer list-none py-4 font-semibold">
                      {item.question}
                    </summary>
                    <p className="text-muted-foreground pb-5 leading-relaxed">{item.answer}</p>
                  </details>
                ))}
              </div>
            </div>
          </Container>
        </section>
      </main>
    </>
  );
}
