import { socialImage } from '@/lib/social-image';
import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';

import { buttonClass } from '@/components/ui/button';
import { Icon } from '@/components/ui/icons';
import { Container } from '@/components/ui/layout';
import { getDictionary } from '@/config/dictionary';
import { AuthFragmentNotice } from '@/features/auth/AuthFragmentNotice';
import { EventEditorial } from '@/features/landing/EventEditorial';
import { InteractiveRsvpDemo } from '@/features/landing/InteractiveRsvpDemo';
import { InvitationLetter } from '@/features/landing/InvitationLetter';
import { WrittenHeading } from '@/features/landing/WrittenHeading';
import { RsvpFlowSteps } from '@/features/landing/RsvpFlowSteps';
import { SiteHeader } from '@/features/layout/SiteHeader';
import { PricingCards } from '@/features/pricing/PricingCards';
import { languageAlternates, localePath, openGraphLocale, type Locale } from '@/lib/i18n';
import { structuredData } from '@/lib/structuredData';
import { supportWhatsAppUrl } from '@/lib/supportContact';

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
  const { hero, plans, faq, occasions, closing } = landing;
  const dictionary = getDictionary(locale);
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData(locale)).replace(/</g, '\\u003c'),
        }}
      />
      <SiteHeader locale={locale} showLanguageSwitch showLandingLinks />
      <main id="main" className="flex flex-1 flex-col">
        <div className="px-5 pt-5 empty:hidden">
          <AuthFragmentNotice locale={locale} />
        </div>

        <section className="relative isolate overflow-hidden bg-[#fbf7f1] py-9 sm:py-20 lg:py-24">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -start-52 -top-52 size-[36rem] rounded-full bg-[#e3d1c3]/40 blur-3xl"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute end-0 bottom-0 h-px w-full bg-gradient-to-l from-transparent via-[#c8ab85] to-transparent"
          />
          <Container width="wide">
            <div className="relative grid min-w-0 items-center gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
              <div className="relative z-10 min-w-0 text-center lg:text-start">
                <div className="enter enter-1 inline-flex items-center gap-3 text-xs font-bold tracking-[0.12em] text-[#865f43] sm:text-sm">
                  <span aria-hidden="true" className="h-px w-9 bg-[#a57a55]" />
                  {hero.eyebrow}
                </div>
                <h1 className="mt-5 font-[family-name:var(--font-display)] text-[clamp(2.55rem,5.2vw,5.25rem)] leading-[1.1] font-bold tracking-tight text-[#432633] sm:mt-7">
                  <span className="block">{hero.titleLead}</span>
                  <span className="mt-2 block text-[#805738]">{hero.titleAccent}</span>
                </h1>
                <p className="enter enter-3 mx-auto mt-5 max-w-[35rem] text-base leading-8 text-[#6b5c5e] sm:mt-7 sm:text-lg lg:mx-0">
                  {hero.lead}
                </p>
                <div className="enter enter-4 mt-6 flex flex-wrap items-center justify-center gap-3 sm:mt-9 lg:justify-start">
                  <Link
                    href={localePath(locale, '/signup')}
                    className={buttonClass({
                      size: 'lg',
                      className: 'min-h-14 px-8 shadow-[0_14px_32px_-15px_rgba(68,38,51,0.42)]',
                    })}
                  >
                    {hero.ctaPrimary}
                    <Icon name="arrow-forward" className="size-4" />
                  </Link>
                  <Link
                    href="#demo"
                    className="inline-flex min-h-14 items-center justify-center gap-2 rounded-full border border-[#bda99d] bg-white/75 px-7 text-sm font-semibold text-[#4c3039] shadow-sm transition-colors hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8b5b42] sm:text-base"
                  >
                    <Icon name="eye" className="size-5" />
                    {locale === 'he' ? 'התנסו בהדגמה' : 'Explore the live demo'}
                  </Link>
                </div>
                <ul className="enter enter-5 mt-6 flex flex-wrap justify-center gap-x-6 gap-y-3 text-sm text-[#665b57] sm:mt-9 lg:justify-start">
                  {hero.facts.map((fact) => (
                    <li key={fact} className="flex items-center gap-2">
                      <Icon name="check-circle" className="size-4 text-[#8e6847]" />
                      {fact}
                    </li>
                  ))}
                </ul>
                <div className="mt-11 hidden items-center gap-3 border-t border-[#e0d4c8] pt-6 text-start lg:flex">
                  <div
                    aria-hidden="true"
                    className="flex size-11 items-center justify-center rounded-full bg-[#efe2d0] text-[#654052]"
                  >
                    <Icon name="heart" className="size-5" />
                  </div>
                  <p className="max-w-sm text-sm leading-6 text-[#705f5c]">
                    {locale === 'he'
                      ? 'שולחים הזמנה מרגשת, מקבלים תשובות ברורות ונשארים פנויים לשמחה עצמה.'
                      : 'Send a beautiful invitation, get clear answers and enjoy the celebration.'}
                  </p>
                </div>
              </div>

              <div className="relative mx-auto w-full max-w-[510px] min-w-0 sm:px-7 lg:max-w-none lg:pb-8">
                <div
                  aria-hidden="true"
                  className="absolute -inset-x-1 inset-y-5 hidden rounded-t-[12rem] rounded-b-[2rem] border border-[#c9ab83]/70 sm:inset-x-4 lg:block"
                />
                <div
                  data-testid="editorial-hero-photo"
                  className="group relative aspect-[5/6] overflow-hidden rounded-t-[12rem] rounded-b-[1.7rem] bg-[#dfd2c1] shadow-[0_30px_75px_-30px_rgba(55,33,38,0.4)] sm:aspect-[5/5.9]"
                >
                  <Image
                    src="/media/wedding-reception.webp"
                    alt={
                      locale === 'he'
                        ? 'צילום להמחשה של שולחן חגיגי מעוצב עם פרחים באולם אירועים'
                        : 'Illustrative photograph of an elegant floral reception table'
                    }
                    fill
                    priority
                    sizes="(max-width: 1023px) 100vw, 45vw"
                    className="object-cover object-center group-hover:scale-[1.035] motion-safe:transition-transform motion-safe:duration-[1600ms] motion-safe:ease-out"
                  />
                  <div
                    aria-hidden="true"
                    className="absolute inset-0 bg-gradient-to-t from-[#1d1b1a]/55 via-transparent to-[#1b1b1b]/10"
                  />
                  <div
                    data-testid="hero-photo-caption"
                    className="absolute inset-x-0 bottom-7 px-4 text-center text-white sm:bottom-10 lg:bottom-44"
                  >
                    <span
                      aria-hidden="true"
                      className="mx-auto mb-3 block h-px w-12 bg-[#edd6ae]"
                    />
                    <p className="font-[family-name:var(--font-display)] text-2xl font-bold drop-shadow-md sm:text-3xl">
                      {locale === 'he' ? 'השמחה היא הסיפור שלכם' : 'Your celebration is the story'}
                    </p>
                    <p className="mt-2 text-xs text-white/85">
                      {locale === 'he' ? 'צילום אווירה להמחשה' : 'Illustrative event photograph'}
                    </p>
                  </div>
                </div>
                <InvitationLetter locale={locale} />
              </div>
            </div>
          </Container>
        </section>

        <section
          aria-label={occasions.lead}
          className="border-y border-[#e6dace] bg-white py-6 sm:py-8"
        >
          <Container width="wide">
            <div className="flex flex-col items-center gap-5 lg:flex-row lg:gap-9">
              <p className="shrink-0 text-sm font-bold text-[#785440]">{occasions.lead}</p>
              <ul className="flex flex-wrap items-center justify-center gap-x-5 gap-y-3 text-sm text-[#695b5a] lg:justify-start">
                {occasions.items.map((item, index) => (
                  <li key={item} className="flex items-center gap-2">
                    <span aria-hidden="true" className="size-1.5 rounded-full bg-[#ba976d]" />
                    <span>{item}</span>
                    {index < occasions.items.length - 1 && <span className="sr-only">,</span>}
                  </li>
                ))}
              </ul>
            </div>
          </Container>
        </section>

        <RsvpFlowSteps locale={locale} />

        <InteractiveRsvpDemo locale={locale} />

        <EventEditorial locale={locale} />

        <section id="pricing" className="scroll-mt-24 bg-[#eee7de] py-16 sm:py-24">
          <Container width="wide">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-eyebrow text-accent-strong font-semibold">{plans.eyebrow}</p>
              <h2 className="text-h1 text-primary mt-3 font-bold">
                <WrittenHeading text={plans.title} trigger="scroll" />
              </h2>
              <p className="text-muted-foreground mt-4 leading-relaxed">{plans.lead}</p>
            </div>
            <div className="mt-11">
              <PricingCards locale={locale} showTrial={false} compact />
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
            <div className="reveal relative overflow-hidden rounded-[2rem] border border-[#ad8a66]/35 bg-[#412735] px-6 py-14 text-center shadow-[0_24px_75px_-32px_rgba(54,33,42,0.4)] sm:px-12 sm:py-20">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_100%,rgba(177,122,81,0.24),transparent_65%)]"
              />
              <div className="relative mx-auto max-w-2xl">
                <p className="text-eyebrow font-semibold text-[#e6bf86]">{closing.eyebrow}</p>
                <h2 className="mt-3 font-[family-name:var(--font-display)] text-3xl font-bold text-white sm:text-5xl">
                  {closing.title}
                </h2>
                <p className="mx-auto mt-5 max-w-xl text-base leading-8 text-white/80 sm:text-lg">
                  {closing.body}
                </p>
                <div className="mt-8 flex flex-wrap justify-center gap-3">
                  <Link
                    href={localePath(locale, '/signup')}
                    className={buttonClass({
                      variant: 'gold',
                      size: 'lg',
                      className: 'border-[#efd19a] bg-[#e6c68d] text-[#412735] hover:bg-[#f5dcae]',
                    })}
                  >
                    {closing.cta}
                  </Link>
                  <a
                    href={supportWhatsAppUrl(
                      dictionary.pricing.whatsappIntro.replace('{plan}', 'Basic'),
                    )}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex min-h-13 items-center justify-center gap-2 rounded-full border border-white/40 bg-white/10 px-7 font-semibold text-white transition-colors hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
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
