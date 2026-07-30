import type { Metadata } from 'next';
import Link from 'next/link';

import { buttonClass } from '@/components/ui/button';
import { Card, CardBody, CardTitle } from '@/components/ui/card';
import { Container, Rule, Section, SectionHeader } from '@/components/ui/layout';
import { appConfig } from '@/config/event.config';
import { listEventTypePresets } from '@/config/eventTypes';
import { AuthFragmentNotice } from '@/features/auth/AuthFragmentNotice';
import { SiteHeader } from '@/features/layout/SiteHeader';
import { SITE_ORIGIN } from '@/lib/seo';

/**
 * The landing page.
 *
 * `/` no longer shows an event, and could not once many events coexist: there is no
 * single "the event" to render, and picking one — the newest, say — would show a
 * stranger's celebration to whoever arrived at the root. Every invitation lives at
 * its own unguessable `/e/{publicId}`, and that is the link a host sends.
 *
 * On the copy: every claim below is one the product can keep. There are no invented
 * customer counts, no testimonials and no "trusted by" row, because there is nothing
 * true to put in one yet (§22). What the page has instead is the one claim that is
 * both true and rare — it is free, with no per-guest charge — stated plainly and
 * explained rather than decorated.
 */

export const metadata: Metadata = {
  title: { absolute: 'אישורי הגעה חינם לכל אירוע' },
  description:
    'מערכת חינמית ליצירת הזמנות דיגיטליות ואישורי הגעה לכל סוג אירוע. בלי מנוי, בלי כרטיס אשראי ובלי תשלום לפי אורח.',
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    locale: 'he_IL',
    siteName: appConfig.siteName,
    title: 'אישורי הגעה חינם לכל אירוע',
    description:
      'הזמנות דיגיטליות ואישורי הגעה חינם לכל סוג אירוע. בלי מנוי ובלי תשלום לפי אורח.',
    url: '/',
  },
};

const STEPS = [
  {
    n: '01',
    title: 'יוצרים אירוע',
    body: 'בוחרים סוג אירוע, ממלאים תאריך, שעה ומקום. הנוסח המתאים לסוג האירוע נטען מעצמו.',
  },
  {
    n: '02',
    title: 'שולחים קישור',
    body: 'לכל אירוע נוצרת כתובת פרטית משלו. מעתיקים אותה לוואטסאפ ושולחים לרשימת המוזמנים.',
  },
  {
    n: '03',
    title: 'רואים מי מגיע',
    body: 'התשובות נאספות לרשימה אחת, עם ספירת מבוגרים, ילדים ותינוקות ופירוט דרישות התזונה.',
  },
] as const;

const FEATURES = [
  {
    title: 'הזמנה שנראית כמו הזמנה',
    body: 'כרטיס מעוצב עם תאריך עברי, ספירה לאחור וכפתורי ניווט ל-Waze ול-Google Maps — לא טופס עם כותרת.',
  },
  {
    title: 'עברית ו-RTL אמיתיים',
    body: 'כל מסך נבנה מימין לשמאל מהיסוד, כולל טפסים, טבלאות ומספרי טלפון.',
  },
  {
    title: 'עובד על כל טלפון',
    body: 'האורחים פותחים את הקישור בוואטסאפ ועונים בלי להתקין דבר ובלי להירשם.',
  },
  {
    title: 'הנתונים נשארים שלכם',
    body: 'רשימת האורחים גלויה לחשבון שיצר את האירוע בלבד, ונמחקת לאחר האירוע.',
  },
] as const;

const FAQ = [
  {
    q: 'זה באמת חינם?',
    a: 'כן. המערכת רצה על המסלול החינמי של Vercel ושל Supabase, ולכן אין מנוי, אין תשלום לפי אורח ואין הגבלה על מספר ההזמנות.',
  },
  {
    q: 'האורחים צריכים להירשם?',
    a: 'לא. הם פותחים את הקישור, ממלאים שם, טלפון וכמה מגיעים, ומאשרים. זה הכול.',
  },
  {
    q: 'מה קורה לפרטים של האורחים?',
    a: 'הם נשמרים לצורך ארגון האירוע בלבד, גלויים רק לחשבון שיצר את האירוע, ונמחקים לאחריו. הפירוט המלא נמצא במדיניות הפרטיות.',
  },
  {
    q: 'אפשר לערוך את ההזמנה אחרי ששלחתי אותה?',
    a: 'כן. הקישור נשאר אותו קישור, והשינויים מופיעים אצל כל מי שיפתח אותו מאותו רגע.',
  },
] as const;

/**
 * §12. Structured data, and only the part of it that is true.
 *
 * Two nodes in one graph. `WebApplication` with a zero-price `Offer` is the whole
 * product claim: this is a web app and it costs nothing. `FAQPage` is built from the
 * same `FAQ` array the page renders below, which is the condition Google actually
 * enforces — markup describing questions a visitor cannot see on the page is a
 * structured-data violation, and deriving both from one array is what stops the two
 * drifting apart when someone edits the copy.
 *
 * There is no `AggregateRating` and no `review`. The product has no ratings, and a
 * fabricated one is both a manual-action risk and the exact thing §22 rules out of the
 * landing copy.
 *
 * What this buys, honestly: eligibility and presentation, not position. It can widen
 * the result once the page ranks for something. It cannot make it rank.
 */
const STRUCTURED_DATA = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebApplication',
      name: appConfig.siteName,
      description: appConfig.siteDescription,
      url: SITE_ORIGIN,
      applicationCategory: 'LifestyleApplication',
      // A browser is the requirement; naming an OS would be a narrower claim than the
      // truth.
      operatingSystem: 'Web',
      inLanguage: 'he-IL',
      isAccessibleForFree: true,
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'ILS' },
    },
    {
      '@type': 'FAQPage',
      inLanguage: 'he-IL',
      mainEntity: FAQ.map((item) => ({
        '@type': 'Question',
        name: item.q,
        acceptedAnswer: { '@type': 'Answer', text: item.a },
      })),
    },
  ],
} as const;

export default function LandingPage() {
  const eventTypes = listEventTypePresets();

  return (
    <>
      {/*
        The one `dangerouslySetInnerHTML` in the application, and the CSP note in
        next.config.ts names it. React escapes text children, which would turn the
        quotes in this JSON into `&quot;` and hand a crawler an unparseable block, so
        there is no safe alternative that still produces valid JSON-LD. The input is a
        frozen object literal from config — no request data reaches it — and `<` is
        escaped anyway so no value could ever close the tag early.
      */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(STRUCTURED_DATA).replace(/</g, '\\u003c'),
        }}
      />
      <SiteHeader />
      <main id="main" className="flex flex-1 flex-col">
        {/*
          Here as well as on /login, because this is where an expired recovery link
          actually lands: when Supabase cannot honour `redirectTo` it falls back to the
          configured Site URL, which is the site root. Without this the host arrives at
          a normal landing page and has no idea their link failed.
        */}
        <div className="px-5 pt-5 empty:hidden">
          <AuthFragmentNotice />
        </div>
        {/* ── Hero ───────────────────────────────────────────────────────────────
            Split rather than centred: a centred hero with a single column is the
            layout every template ships with, and the right-hand panel earns its
            place by showing the actual artefact the product makes. */}
        <Section spacing="lg" className="overflow-hidden">
          <div
            aria-hidden="true"
            className="from-secondary/45 pointer-events-none absolute inset-x-0 top-0 -z-10 h-[36rem] bg-gradient-to-b to-transparent"
          />
          <Container>
            <div className="grid items-center gap-14 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
              <div className="animate-rise text-center lg:text-start">
                <p className="text-eyebrow text-accent-strong inline-flex items-center gap-2.5 font-semibold">
                  <span aria-hidden="true" className="bg-accent h-px w-6" />
                  חינם לחלוטין
                </p>
                <h1 className="text-display text-primary mt-5 font-bold">
                  אישורי הגעה
                  <span className="text-accent-strong block">לאירוע שלכם</span>
                </h1>
                <p className="text-lead text-muted-foreground mt-6 max-w-xl leading-relaxed lg:mx-0">
                  הזמנה דיגיטלית מעוצבת וטופס אישור הגעה, לכל סוג אירוע. בלי מנוי, בלי תשלום לפי
                  אורח ובלי הגבלה על מספר ההזמנות.
                </p>
                <div className="mt-9 flex flex-wrap justify-center gap-3 lg:justify-start">
                  <Link href="/signup" className={buttonClass({ size: 'lg' })}>
                    יצירת אירוע
                  </Link>
                  <Link href="/login" className={buttonClass({ variant: 'outline', size: 'lg' })}>
                    כניסה לחשבון
                  </Link>
                </div>
                {/* Facts about the product, not claims about its popularity. */}
                <ul className="text-muted-foreground mt-9 flex flex-wrap justify-center gap-x-6 gap-y-2.5 text-sm lg:justify-start">
                  {['בלי כרטיס אשראי', 'בלי הגבלת אורחים', '11 סוגי אירוע'].map((fact) => (
                    <li key={fact} className="flex items-center gap-2">
                      <svg
                        aria-hidden="true"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={2}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="text-accent-strong size-4 shrink-0"
                      >
                        <path d="m5 12.5 4.5 4.5L19 7.5" />
                      </svg>
                      {fact}
                    </li>
                  ))}
                </ul>
              </div>

              {/* A miniature of the real invitation, drawn from the same tokens as the
                  real one. It is decorative — the page states everything it shows in
                  text — so the whole panel is hidden from assistive technology. */}
              <div aria-hidden="true" className="animate-rise relative mx-auto w-full max-w-sm">
                <div className="border-accent/60 bg-card shadow-lifted rotate-[-1.5deg] rounded-2xl border-2 p-2.5">
                  <div className="border-accent/35 from-secondary/25 rounded-xl border bg-gradient-to-b via-white/90 to-white/90 px-6 py-9 text-center">
                    <p className="text-muted-foreground text-xs">ב״ה</p>
                    <p className="text-foreground mt-5 text-sm leading-relaxed">
                      בשבח והודיה לה׳ יתברך
                      <br />
                      שמחים להזמינכם לחתונה של
                    </p>
                    <p className="text-primary mt-4 font-[family-name:var(--font-display)] text-3xl font-bold">
                      חתונה
                    </p>
                    <Rule className="my-6" />
                    <div className="text-primary flex justify-center gap-5 text-xs font-semibold">
                      {[
                        { k: 'תאריך', v: 'י״ד באלול' },
                        { k: 'שעה', v: '19:00' },
                        { k: 'מקום', v: 'אולמי הדר' },
                      ].map((cell) => (
                        <div key={cell.k}>
                          <span className="text-muted-foreground block font-normal">{cell.k}</span>
                          {cell.v}
                        </div>
                      ))}
                    </div>
                    <Rule className="my-6" />
                    <div className="flex justify-center gap-2" dir="ltr">
                      {[
                        ['42', 'ימים'],
                        ['06', 'שעות'],
                        ['18', 'דקות'],
                      ].map(([n, l]) => (
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
                {/* A caption, not a counter. An invented "128 guests confirmed" here
                    would be a business statistic the product cannot stand behind
                    (§22), and a mockup is not the place to make one up. */}
                <div className="border-border bg-card/85 shadow-raised absolute start-0 -bottom-5 rounded-xl border px-4 py-2.5 backdrop-blur-sm">
                  <p className="text-muted-foreground text-[11px]">כך נראית ההזמנה</p>
                  <p className="text-primary text-sm font-semibold">שנשלחת בוואטסאפ</p>
                </div>
              </div>
            </div>
          </Container>
        </Section>

        {/* ── The claim, on the one dark band of the page ────────────────────── */}
        <Section tone="ink" spacing="sm">
          <Container width="card" className="text-center">
            <p className="text-eyebrow text-accent font-semibold">למה בחינם</p>
            <p className="mt-5 font-[family-name:var(--font-display)] text-2xl leading-snug font-bold text-balance sm:text-3xl">
              שירותי אישורי הגעה גובים לפי אורח. אנחנו לא.
            </p>
            <p className="mt-5 leading-relaxed text-white/75">
              המערכת בנויה כך שהיא נכנסת במלואה למסלול החינמי של Vercel ושל Supabase. אין עלות
              להפעיל אותה, ולכן אין סיבה לגבות עליה.
            </p>
          </Container>
        </Section>

        {/* ── How it works: an editorial list, not three identical cards ─────── */}
        <Section aria-labelledby="how">
          <Container width="app">
            <SectionHeader
              id="how"
              eyebrow="שלושה שלבים"
              title="איך זה עובד."
              lede="מהרגע שנכנסתם ועד שהאישור הראשון מגיע."
            />
            <ol className="mt-14 space-y-px">
              {STEPS.map((step) => (
                <li
                  key={step.n}
                  className="border-border grid gap-3 border-t py-8 last:border-b sm:grid-cols-[auto_1fr_1.4fr] sm:items-baseline sm:gap-8"
                >
                  <span
                    aria-hidden="true"
                    // Solid, not /70. At 70% opacity this rendered as #ab8e67 on the
                    // paper background — 2.96:1, which the axe scan failed against
                    // WCAG 1.4.3's 3:1 floor for large text. Muting a gold numeral by
                    // dropping its alpha is the exact move that quietly breaks
                    // contrast, so the weight comes from size and tracking instead.
                    className="text-accent-strong font-[family-name:var(--font-display)] text-2xl font-bold tabular-nums"
                  >
                    {step.n}
                  </span>
                  <h3 className="text-primary text-h3 font-semibold">{step.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">{step.body}</p>
                </li>
              ))}
            </ol>
          </Container>
        </Section>

        {/* ── What you get: asymmetric grid, so it does not repeat the rhythm ── */}
        <Section tone="sand" aria-labelledby="features">
          <Container>
            <SectionHeader
              id="features"
              eyebrow="מה מקבלים"
              title="הכול כלול. בלי שדרוגים."
              align="start"
            />
            {/*
              A clean 2×2. An earlier version spanned the first card across both
              columns, which with four items left the fourth stranded alone on the last
              row — the uneven, unbalanced grid §6 of the brief calls out. Hierarchy
              comes from the lead card's accent surface instead, which costs no layout.
            */}
            <div className="mt-12 grid gap-5 sm:grid-cols-2">
              {FEATURES.map((feature, index) => (
                <Card
                  key={feature.title}
                  interactive
                  padding="lg"
                  variant={index === 0 ? 'accent' : 'paper'}
                >
                  <CardTitle>{feature.title}</CardTitle>
                  <CardBody>{feature.body}</CardBody>
                </Card>
              ))}
            </div>
          </Container>
        </Section>

        {/* ── Event types ─────────────────────────────────────────────────────
            A moving band rather than a static cloud of pills. Eleven event types is
            the product's real breadth and the pill list undersold it — a strip that
            keeps moving reads as a catalogue that continues past the edge of the
            screen, which is exactly the claim being made. */}
        <Section aria-labelledby="types" spacing="sm">
          <Container width="card">
            <SectionHeader
              id="types"
              eyebrow="מתאים לכל שמחה"
              title="אחד עשר סוגי אירוע."
              lede="כל סוג מגיע עם הברכה, נוסח ההזמנה ותוויות הצדדים המתאימים לו — ואפשר לשנות כל אחד מהם."
            />
          </Container>
        </Section>

        <div className="marquee-mask border-border/70 relative overflow-hidden border-y py-5">
          {/*
            Duplicated on purpose and hidden from assistive technology: the animation
            needs two copies to loop seamlessly, and a screen reader must not hear the
            eleven types twice. The accessible copy is the visually-hidden list below.
          */}
          <div aria-hidden="true" className="marquee-track flex w-max gap-3">
            {[0, 1].map((copy) => (
              <div key={copy} className="flex shrink-0 gap-3">
                {eventTypes.map((preset) => (
                  <span
                    key={preset.value}
                    className="border-accent-strong/25 bg-card text-primary shadow-paper flex items-center gap-3 rounded-full border px-5 py-2.5 text-sm font-medium whitespace-nowrap"
                  >
                    {preset.label}
                    <span className="bg-accent size-1 rounded-full" />
                  </span>
                ))}
              </div>
            ))}
          </div>
          <ul className="sr-only">
            {eventTypes.map((preset) => (
              <li key={preset.value}>{preset.label}</li>
            ))}
          </ul>
        </div>

        {/* ── FAQ ───────────────────────────────────────────────────────────── */}
        <Section tone="sand" aria-labelledby="faq">
          <Container width="card">
            <SectionHeader id="faq" eyebrow="שאלות" title="מה שנשאלנו עד עכשיו." />
            <div className="mt-11 space-y-3">
              {FAQ.map((item) => (
                <details
                  key={item.q}
                  className="group border-border bg-card [&[open]]:shadow-paper rounded-xl border px-5 transition-shadow"
                >
                  {/* A native <details>: it is keyboard operable, announced correctly
                      and works with JavaScript disabled, none of which a hand-rolled
                      accordion gets for free. */}
                  <summary className="text-primary flex cursor-pointer list-none items-center justify-between gap-4 py-4 font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[--color-ring] [&::-webkit-details-marker]:hidden">
                    {item.q}
                    <svg
                      aria-hidden="true"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2}
                      strokeLinecap="round"
                      className="text-accent-strong size-4 shrink-0 transition-transform duration-[--duration-base] group-open:rotate-180"
                    >
                      <path d="m6 9 6 6 6-6" />
                    </svg>
                  </summary>
                  <p className="text-muted-foreground pb-5 leading-relaxed">{item.a}</p>
                </details>
              ))}
            </div>
          </Container>
        </Section>

        {/* ── Closing call to action ────────────────────────────────────────── */}
        <Section spacing="lg">
          <Container width="card">
            <Card variant="accent" padding="lg" className="text-center">
              <Rule className="mb-7" />
              <h2 className="text-h2 text-primary font-bold">מתחילים?</h2>
              <p className="text-muted-foreground mx-auto mt-4 max-w-md leading-relaxed">
                יצירת חשבון לוקחת פחות מדקה, וההזמנה הראשונה מוכנה לשליחה מיד אחריה.
              </p>
              <Link href="/signup" className={buttonClass({ size: 'lg', className: 'mt-8' })}>
                יצירת אירוע חינם
              </Link>
            </Card>
          </Container>
        </Section>
      </main>
    </>
  );
}
