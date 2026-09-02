import type { Metadata } from 'next';
import Link from 'next/link';

import { buttonClass } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Container, Rule } from '@/components/ui/layout';
import { getDictionary } from '@/config/dictionary';
import { AuthFragmentNotice } from '@/features/auth/AuthFragmentNotice';
import { Candlelight } from '@/features/landing/Candlelight';
import { WrittenHeading, writingDuration } from '@/features/landing/WrittenHeading';
import { TiltCard } from '@/features/landing/TiltCard';
import { RsvpFlowSteps } from '@/features/landing/RsvpFlowSteps';
import { SiteHeader } from '@/features/layout/SiteHeader';
import { PricingCards } from '@/features/pricing/PricingCards';
import { languageAlternates, localePath, openGraphLocale, type Locale } from '@/lib/i18n';
import { structuredData } from '@/lib/structuredData';

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
          {/* Behind everything in the hero, and behind nothing else — the drift is a
              welcome, not a background the whole site sits on. */}
          <div aria-hidden="true" className="hero-glow" />
          <Candlelight />
          <Container width="wide">
            <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr]">
              <div className="text-center lg:text-start">
                <p className="enter enter-1 text-eyebrow text-accent-strong font-semibold">
                  {hero.eyebrow}
                </p>
                {/*
                  No `enter` on the heading: its words carry their own arrival, and
                  running both would move each word twice — once with the block and once
                  on its own.

                  The second line starts exactly as the first finishes, so the caret runs
                  off the end of one line and picks up at the start of the next instead of
                  restarting. `writingDuration` rather than a hand-tuned number, because a
                  literal here would drift the moment the copy changed by a word.
                */}
                <h1 className="text-display text-primary mt-5 font-bold">
                  <WrittenHeading text={hero.titleLead} as="span" />
                  <WrittenHeading
                    text={hero.titleAccent}
                    as="div"
                    delay={writingDuration(hero.titleLead)}
                    className="text-accent-strong"
                  />
                </h1>
                <p className="enter enter-3 text-lead text-muted-foreground mt-6 max-w-2xl leading-relaxed lg:mx-0">
                  {hero.lead}
                </p>
                <div className="enter enter-4 mt-9 flex flex-wrap justify-center gap-3 lg:justify-start">
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
                <ul className="enter enter-5 text-muted-foreground mt-8 flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm lg:justify-start">
                  {hero.facts.map((fact) => (
                    <li key={fact} className="flex items-center gap-2">
                      <span aria-hidden="true" className="bg-accent-strong size-1.5 rounded-full" />
                      {fact}
                    </li>
                  ))}
                </ul>
              </div>

              <div
                aria-hidden="true"
                className="enter enter-3 parallax-slow relative mx-auto w-full max-w-sm"
              >
                <TiltCard>
                  <div className="card-lift border-accent/60 bg-card rounded-2xl border-2 p-2.5">
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
                      <Rule draw="load" className="my-6" />
                      <div className="text-primary flex justify-center gap-5 text-xs font-semibold">
                        {[
                          { k: preview.dateLabel, v: preview.dateValue },
                          { k: preview.timeLabel, v: preview.timeValue },
                          { k: preview.placeLabel, v: preview.placeValue },
                        ].map((cell) => (
                          <div key={cell.k}>
                            <span className="text-muted-foreground block font-normal">
                              {cell.k}
                            </span>
                            {cell.v}
                          </div>
                        ))}
                      </div>
                      <Rule draw="load" className="my-6" />
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
                </TiltCard>
                {/* Outside the tilt on purpose: the badge is pinned to the card's corner
                    in page space, and rotating it with the card would swing it out of
                    alignment with the edge it is supposed to be sitting on. */}
                <div className="border-border bg-card/85 shadow-raised absolute start-0 -bottom-5 rounded-xl border px-4 py-2.5 backdrop-blur-sm">
                  <p className="text-muted-foreground text-[11px]">{preview.captionLead}</p>
                  <p className="text-primary text-sm font-semibold">{preview.captionAccent}</p>
                </div>
              </div>
            </div>
          </Container>
        </section>

        <RsvpFlowSteps locale={locale} />

        {/*
          The `reveal` moved off the <section> and onto the content below each heading.

          It cannot stay on an ancestor of a scroll-driven heading: `view()` measures the
          word's own position in the viewport, and a parent that is translating the word
          upward is changing the very quantity the word's progress is computed from. The
          heading now carries its own arrival and the content below carries the reveal, so
          the two never feed into each other.
        */}
        <section className="py-16 sm:py-20">
          <Container width="wide">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-eyebrow text-accent-strong font-semibold">{benefits.eyebrow}</p>
              <h2 className="text-h1 text-primary mt-3 font-bold">
                <WrittenHeading text={benefits.title} trigger="scroll" />
              </h2>
            </div>
            <div className="reveal-stagger mt-10 grid gap-5 md:grid-cols-3">
              {benefits.items.map((benefit) => (
                // Five degrees, not the hero's nine: the same angle on a short wide box
                // reads as the grid being crooked rather than as a card being tipped.
                <TiltCard key={benefit.title} degrees={5} className="reveal h-full">
                  <Card padding="lg" interactive className="h-full">
                    <h3 className="text-h3 text-primary font-semibold">{benefit.title}</h3>
                    <p className="text-muted-foreground mt-3 leading-relaxed">{benefit.body}</p>
                  </Card>
                </TiltCard>
              ))}
            </div>
          </Container>
        </section>

        <section className="bg-secondary/25 py-16 sm:py-20">
          <Container width="wide">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-eyebrow text-accent-strong font-semibold">{plans.eyebrow}</p>
              <h2 className="text-h1 text-primary mt-3 font-bold">
                <WrittenHeading text={plans.title} trigger="scroll" />
              </h2>
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
              <h2 className="text-h1 text-primary mt-3 text-center font-bold">
                <WrittenHeading text={faq.title} trigger="scroll" />
              </h2>
              <div className="reveal-stagger mt-9 space-y-3">
                {faq.items.map((item) => (
                  <details
                    key={item.question}
                    className="reveal border-border bg-card rounded-xl border px-5"
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
