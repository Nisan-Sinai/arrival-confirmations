import { socialImage } from '@/lib/social-image';
import type { Metadata } from 'next';
import Link from 'next/link';

import { buttonClass } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Icon, type IconName } from '@/components/ui/icons';
import { Container, Rule } from '@/components/ui/layout';
import { getDictionary } from '@/config/dictionary';
import { AuthFragmentNotice } from '@/features/auth/AuthFragmentNotice';
import { Candlelight } from '@/features/landing/Candlelight';
import { InteractiveRsvpDemo } from '@/features/landing/InteractiveRsvpDemo';
import { WrittenHeading } from '@/features/landing/WrittenHeading';
import { writingDuration } from '@/features/landing/writingPace';
import { TiltCard } from '@/features/landing/TiltCard';
import { RsvpFlowSteps } from '@/features/landing/RsvpFlowSteps';
import { SiteHeader } from '@/features/layout/SiteHeader';
import { PricingCards } from '@/features/pricing/PricingCards';
import { languageAlternates, localePath, openGraphLocale, type Locale } from '@/lib/i18n';
import { structuredData } from '@/lib/structuredData';
import { supportWhatsAppUrl } from '@/lib/supportContact';

/** One glyph per benefit, in the order the dictionary lists them. */
const BENEFIT_ICONS: readonly IconName[] = ['calendar', 'dashboard', 'globe'];

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
      images: [socialImage(locale)],
      type: 'website',
      locale: openGraphLocale(locale),
      siteName: site.name,
      title: landing.meta.ogTitle,
      description: landing.meta.ogDescription,
      url: path,
    },
    twitter: {
      images: [socialImage(locale)],
      card: 'summary_large_image',
      title: landing.meta.ogTitle,
      description: landing.meta.ogDescription,
    },
  };
}

export function LandingPage({ locale }: { locale: Locale }) {
  const { landing } = getDictionary(locale);
  const { hero, invitationPreview: preview, benefits, plans, faq, occasions, closing } = landing;
  const dictionary = getDictionary(locale);
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

        <section className="relative isolate overflow-hidden bg-[#301b26] py-16 text-white sm:py-24 lg:py-28">
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_75%_40%,rgba(151,85,94,0.28),transparent_55%),radial-gradient(ellipse_at_0%_100%,rgba(218,174,113,0.11),transparent_45%)]" />
          <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#d9aa71]/60 to-transparent" />
          <Candlelight />
          <Container width="wide">
            <div className="relative grid min-w-0 items-center gap-14 lg:grid-cols-[1.06fr_0.94fr] lg:gap-16">
              <div className="min-w-0 text-center lg:text-start">
                <p className="enter enter-1 inline-flex items-center gap-2.5 rounded-full border border-[#dfbc88]/40 bg-white/[0.06] px-4 py-2 text-xs font-semibold tracking-wide text-[#f1d29e] sm:text-sm">
                  <Icon name="sparkles" className="size-4" /> {hero.eyebrow}
                </p>
                <h1 className="mt-7 font-[family-name:var(--font-display)] text-[clamp(2.6rem,5vw,5rem)] leading-[1.16] font-bold tracking-tight">
                  <WrittenHeading text={hero.titleLead} as="span" />
                  <WrittenHeading text={hero.titleAccent} as="div" delay={writingDuration(hero.titleLead)} className="text-[#f1cf96]" />
                </h1>
                <p className="enter enter-3 mx-auto mt-7 max-w-xl text-base leading-8 text-white/75 sm:text-lg lg:mx-0">{hero.lead}</p>
                <div className="enter enter-4 mt-9 flex flex-wrap justify-center gap-3 lg:justify-start">
                  <Link href={localePath(locale, '/signup')} className={buttonClass({ variant: 'gold', size: 'lg', className: 'border-[#e6c390] bg-[#e9c892] text-[#381c26] shadow-[0_12px_35px_-13px_rgba(240,202,148,0.45)] hover:bg-[#f2d9ad]' })}>
                    {hero.ctaPrimary} <Icon name="arrow-forward" className="size-4" />
                  </Link>
                  <Link href="#demo" className="inline-flex min-h-13 items-center justify-center gap-2 rounded-full border border-white/35 bg-white/[0.06] px-7 font-semibold text-white transition-colors hover:bg-white/15 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e9c892]">
                    <Icon name="eye" className="size-5" /> {locale === 'he' ? 'צפו בהדגמה חיה' : 'Try the live demo'}
                  </Link>
                </div>
                <ul className="enter enter-5 mt-9 flex flex-wrap justify-center gap-x-6 gap-y-3 text-sm text-white/75 lg:justify-start">
                  {hero.facts.map((fact) => (
                    <li key={fact} className="flex items-center gap-2">
                      <Icon name="check-circle" className="size-4 text-[#e9c892]" />{fact}
                    </li>
                  ))}
                </ul>
                <p className="mt-8 text-sm text-white/55">{locale === 'he' ? 'ממוקדים במה שחשוב באמת: ליהנות מהאירוע שלכם.' : 'More time celebrating. Less time chasing replies.'}</p>
              </div>
              <div className="enter enter-3 relative mx-auto w-full max-w-[425px] min-w-0 pt-7 pb-7 sm:px-4 lg:max-w-none">
                <div aria-hidden="true" className="absolute inset-10 rounded-full bg-[#e7b579]/20 blur-[85px]" />
                <div aria-hidden="true" className="absolute -top-4 start-0 size-32 rounded-full border border-[#d8af77]/30 sm:size-44" />
                <TiltCard degrees={3}>
                  <div className="relative mx-auto w-full max-w-sm rounded-[2rem] border border-[#e9cc9d]/50 bg-[#fffaf4] p-3 shadow-[0_28px_80px_-26px_rgba(0,0,0,0.55)] sm:p-4">
                    <div className="rounded-[1.35rem] border border-[#d8c5a9] bg-[radial-gradient(ellipse_at_50%_0%,#fffdf9,#f6efe4)] px-5 py-9 text-center text-[#633d46] sm:px-8 sm:py-10">
                      <p className="text-sm font-bold tracking-[0.13em] text-[#986f39]">{preview.blessing}</p>
                      <div className="mx-auto mt-5 flex items-center justify-center gap-3 text-[#bb9761]" aria-hidden="true">
                        <span className="h-px w-10 bg-current/70" /><span>✦</span><span className="h-px w-10 bg-current/70" />
                      </div>
                      <p className="mt-5 text-sm leading-7">{preview.introFirstLine}<span className="block">{preview.introSecondLine}</span></p>
                      <p className="mt-5 font-[family-name:var(--font-display)] text-4xl font-bold tracking-tight text-[#602a3c] sm:text-5xl">{preview.occasion}</p>
                      <Rule draw="load" className="my-7" />
                      <div className="grid grid-cols-3 gap-2 text-xs font-semibold text-[#602a3c]">
                        {[{ k: preview.dateLabel, v: preview.dateValue }, { k: preview.timeLabel, v: preview.timeValue }, { k: preview.placeLabel, v: preview.placeValue }].map((cell) => (
                          <div key={cell.k}><span className="mb-1 block font-normal text-[#876e75]">{cell.k}</span><span>{cell.v}</span></div>
                        ))}
                      </div>
                      <Rule draw="load" className="my-7" />
                      <div className="flex justify-center gap-2" dir="ltr">
                        {countdown.map(([n, l]) => (
                          <div key={l} className="min-w-14 rounded-lg border border-[#e5d2b9] bg-white/80 px-2 py-2">
                            <span className="block text-xl leading-none font-bold text-[#602a3c] tabular-nums">{n}</span>
                            <span className="mt-1 block text-[10px] text-[#856b71]">{l}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </TiltCard>
                <div className="absolute end-0 bottom-0 rounded-2xl border border-[#e7d3b2] bg-white px-4 py-3 text-[#492431] shadow-xl sm:end-2">
                  <div className="flex items-center gap-3">
                    <span className="flex size-10 items-center justify-center rounded-full bg-emerald-50 text-emerald-700"><Icon name="check-circle" className="size-5" /></span>
                    <div><span className="block text-xs text-[#7b6068]">{preview.captionLead}</span><span className="block text-sm font-bold">{preview.captionAccent}</span></div>
                  </div>
                </div>
              </div>
            </div>
          </Container>
        </section>

        {/* Event types remain immediately visible below the main call to action. */}
        <section aria-label={occasions.lead} className="border-border/60 border-y py-6 sm:py-7">
          <Container width="wide" className="flex flex-col items-center gap-4 sm:flex-row sm:gap-8">
            <p className="text-eyebrow text-accent-strong shrink-0 font-semibold">
              {occasions.lead}
            </p>
            <div className="marquee-mask w-full min-w-0 flex-1 overflow-hidden" aria-hidden="true">
              <div className="marquee-track flex w-max gap-3">
                {[0, 1].map((copy) =>
                  occasions.items.map((item) => (
                    <span
                      key={`${copy}-${item}`}
                      className="border-border bg-card text-primary shadow-paper inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm font-semibold whitespace-nowrap"
                    >
                      <span aria-hidden="true" className="bg-accent-strong size-1.5 rounded-full" />
                      {item}
                    </span>
                  )),
                )}
              </div>
            </div>
            <ul className="sr-only">
              {occasions.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </Container>
        </section>

        <InteractiveRsvpDemo locale={locale} />

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
              {benefits.items.map((benefit, index) => (
                // Five degrees, not the hero's nine: the same angle on a short wide box
                // reads as the grid being crooked rather than as a card being tipped.
                <TiltCard key={benefit.title} degrees={5} className="reveal h-full">
                  <Card padding="lg" interactive className="h-full">
                    <span
                      aria-hidden="true"
                      className="border-accent-strong/30 bg-accent-soft/50 text-accent-strong flex size-12 items-center justify-center rounded-2xl border"
                    >
                      <Icon name={BENEFIT_ICONS[index] ?? 'check'} className="size-6" />
                    </span>
                    <h3 className="text-h3 text-primary mt-5 font-semibold">{benefit.title}</h3>
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
                    className="faq-item reveal border-border bg-card shadow-paper open:border-accent-strong/30 rounded-2xl border px-5 transition-colors duration-[--duration-fast]"
                  >
                    <summary className="text-primary flex cursor-pointer items-center justify-between gap-4 rounded-lg py-4 font-semibold">
                      {item.question}
                      <span
                        aria-hidden="true"
                        className="faq-chevron border-border text-accent-strong flex size-8 shrink-0 items-center justify-center rounded-full border transition-transform duration-[--duration-base] ease-[--ease-out]"
                      >
                        <Icon name="chevron-down" strokeWidth={2} className="size-4" />
                      </span>
                    </summary>
                    <p className="faq-body text-muted-foreground pb-5 leading-relaxed">
                      {item.answer}
                    </p>
                  </details>
                ))}
              </div>
              <Link
                href={localePath(locale, '/guide')}
                className="text-primary mt-6 inline-flex min-h-11 items-center underline underline-offset-4"
              >
                {locale === 'he'
                  ? 'מדריך להכנת האירוע ולניהול אישורי הגעה'
                  : 'Guide to preparing your event and managing RSVPs'}
              </Link>
            </div>
          </Container>
        </section>

        {/* The last thing on the page is the first thing it asked for. */}
        <section className="pb-16 sm:pb-24">
          <Container width="wide">
            <div className="reveal border-accent-strong/30 from-accent-soft/60 via-card to-card shadow-raised relative overflow-hidden rounded-3xl border bg-gradient-to-br px-6 py-12 text-center sm:px-12 sm:py-16">
              <div aria-hidden="true" className="hero-glow opacity-40" />
              <div className="relative mx-auto max-w-2xl">
                <p className="text-eyebrow text-accent-strong font-semibold">{closing.eyebrow}</p>
                <h2 className="text-h2 text-primary mt-3 font-bold">{closing.title}</h2>
                <p className="text-lead text-muted-foreground mt-4">{closing.body}</p>
                <div className="mt-8 flex flex-wrap justify-center gap-3">
                  <Link
                    href={localePath(locale, '/signup')}
                    className={buttonClass({ size: 'lg' })}
                  >
                    {closing.cta}
                  </Link>
                  <a
                    href={supportWhatsAppUrl(
                      dictionary.pricing.whatsappIntro.replace('{plan}', 'Basic'),
                    )}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={buttonClass({ variant: 'outline', size: 'lg' })}
                  >
                    <Icon name="whatsapp" />
                    {closing.secondary}
                    <span className="sr-only"> ({dictionary.a11y.externalLink})</span>
                  </a>
                </div>
              </div>
            </div>
          </Container>
        </section>
      </main>
    </>
  );
}
