import type { Metadata } from 'next';
import Link from 'next/link';
import { getDictionary } from '@/config/dictionary';

import { formatPlanPrice, getPlanCatalog } from '@/app/_lib/plans';
import { buttonClass } from '@/components/ui/button';
import { Container, Section, SectionHeader } from '@/components/ui/layout';
import { WrittenHeading } from '@/features/landing/WrittenHeading';
import { SiteHeader } from '@/features/layout/SiteHeader';
import { PricingCards } from '@/features/pricing/PricingCards';
import { languageAlternates, localePath, openGraphLocale, type Locale } from '@/lib/i18n';
import { absoluteUrl } from '@/lib/seo';

/**
 * The pricing page, shared by both locales (§12).
 *
 * The activation steps and headings carry their own bilingual copy here rather than in
 * the global dictionary: they belong to this page alone, and keeping them beside the
 * markup is what lets the Hebrew read exactly as it did before the split — the e2e
 * suite pins several of these strings.
 */

type PricingContent = {
  readonly meta: { readonly title: string; readonly description: string };
  readonly eyebrow: string;
  readonly title: string;
  readonly lead: string;
  readonly howTitle: string;
  readonly steps: readonly { readonly title: string; readonly body: string }[];
  readonly startCta: string;
  readonly homeCta: string;
  readonly comparisonTitle: string;
  readonly comparisonLead: string;
  readonly columns: readonly [string, string, string, string];
  readonly suitability: readonly string[];
  readonly preparationTitle: string;
  readonly preparation: readonly string[];
  readonly accessLink: string;
};

const CONTENT: Record<Locale, PricingContent> = {
  he: {
    meta: {
      title: 'מחירים לאישורי הגעה לאירועים',
      description: 'מסלול Basic ב-99 ₪, Premium ב-199 ₪ או Pro ב-349 ₪, בתשלום חד-פעמי לאירוע.',
    },
    eyebrow: 'מחיר פשוט וברור',
    title: 'תשלום חד-פעמי לכל אירוע',
    lead: 'מתחילים בבדיקה חינמית. רק כשמחליטים לפרסם ולקבל אישורי הגעה אמיתיים בוחרים מסלול ומשלמים בטלפון, ב-Bit או בהעברה.',
    howTitle: 'איך ההפעלה עובדת?',
    steps: [
      { title: '1. יוצרים אירוע', body: 'מעצבים ובודקים עד 10 אישורי הגעה ללא תשלום.' },
      { title: '2. משלמים ישירות', body: 'יוצרים קשר בטלפון או ב-WhatsApp ומסדירים תשלום.' },
      {
        title: '3. המסלול נפתח',
        body: 'מנהל המערכת מפעיל את Basic, Premium או Pro והאירוע ממשיך מיד.',
      },
    ],
    startCta: 'התחלת בדיקה חינמית',
    homeCta: 'חזרה לדף הבית',
    comparisonTitle: 'איזה מסלול מתאים לאירוע שלכם?',
    comparisonLead:
      'ההחלטה מתחילה בכמות המוזמנים ובאופן העבודה. אירוע עם הזנה ידנית של הרשימה שונה מאירוע שמצריך ייבוא קובץ, מיתוג וסידור שולחנות. ההשוואה כאן עוזרת לבחור לפי הכלים שתשתמשו בהם בפועל.',
    columns: ['מסלול', 'מחיר לאירוע', 'מגבלת מוזמנים', 'מתי לבחור בו'],
    suitability: [
      'לבדיקת עיצוב ההזמנה ותהליך אישור ההגעה לפני בחירת מסלול בתשלום.',
      'לניהול רשימה שמוסיפים ידנית, עם שיתוף קישורים ואישורי הגעה בדשבורד.',
      'כאשר הרשימה מגיעה מקובץ Excel או CSV, ונדרשים מיתוג וכלים לניהול ההזמנות ומפת שולחנות בסיסית.',
      'כאשר סידור הישיבה הוא חלק מרכזי מההפקה: אזורים, קיבולת, קבוצות, נעילת מקומות ושמירת נקודות שחזור.',
    ],
    preparationTitle: 'מה כדאי לבדוק לפני הפעלת האירוע?',
    preparation: [
      'ספרו את המוזמנים ובחרו מסלול שהמגבלה שלו מתאימה לרשימה. מגבלת הבדיקה החינמית מיועדת לניסוי ולא לאירוע מלא.',
      'בדקו איך תזינו את הרשימה: הוספה ידנית או ייבוא. אם נדרש ייבוא עם שולחן, מושב או מנה, השוו את יכולות Premium ו־Pro.',
      'פתחו את ההזמנה בטלפון, בדקו את פרטי המקום ואת הקישורים, ונסו אישור הגעה לפני הפצה לכל הרשימה.',
      'החליטו אם מספיקה מפת שולחנות בסיסית או שנדרשים כלי ההושבה המתקדמים של Pro. המחיר הוא להפעלת אירוע, ואינו מנוי חודשי.',
    ],
    accessLink: 'מדריך כלי הנגישות והתאמות השימוש במערכת',
  },
  en: {
    meta: {
      title: 'Pricing for event RSVPs',
      description:
        'Compare Basic, Premium and Pro RSVP plans for one event, with a free trial and a single activation payment from ₪99.',
    },
    eyebrow: 'Simple, clear pricing',
    title: 'Paid once, per event',
    lead: 'Start with a free trial run. Only when you decide to publish and collect real replies do you choose a plan and pay by phone, Bit or transfer.',
    howTitle: 'How activation works',
    steps: [
      { title: '1. Create an event', body: 'Design it and collect up to 10 trial replies, free.' },
      {
        title: '2. Pay directly',
        body: 'Get in touch by phone or WhatsApp and settle the payment.',
      },
      {
        title: '3. The plan opens',
        body: 'We activate Basic, Premium or Pro and the event continues right away.',
      },
    ],
    startCta: 'Start a free trial',
    homeCta: 'Back to home',
    comparisonTitle: 'Which plan fits your event?',
    comparisonLead:
      'Start with your guest count and the way you will manage the event. A manually entered list needs different tools from a spreadsheet import with branding and seating arrangements. Compare the workflow you will actually use, as well as the capacity.',
    columns: ['Plan', 'Price per event', 'Guest limit', 'When to choose it'],
    suitability: [
      'Try the invitation design and reply flow before choosing a paid plan.',
      'Manage a manually entered list, share links and follow replies in the dashboard.',
      'Import an Excel or CSV guest list, customise the branding and use a basic seating map.',
      'Make seating part of the production workflow with zones, capacity, groups, locked seats and restore points.',
    ],
    preparationTitle: 'What should you check before activation?',
    preparation: [
      'Count your guests and choose a plan with enough capacity. The free reply allowance is for testing, rather than running a complete event.',
      'Decide whether to enter guests manually or import them. For files with tables, seats or meal choices, compare the Premium and Pro tools.',
      'Open the invitation on a phone, check the venue details and links, and try a reply before sharing it with the whole list.',
      'Decide whether a basic seating map is enough or you need the advanced Pro seating tools. Activation is for an event, rather than a monthly subscription.',
    ],
    accessLink: 'Guide to the accessibility tools and supported ways to use the platform',
  },
};

export function buildPricingMetadata(locale: Locale): Metadata {
  const { meta } = CONTENT[locale];
  return {
    title: meta.title,
    description: meta.description,
    openGraph: {
      title: meta.title,
      description: meta.description,
      url: absoluteUrl(localePath(locale, '/pricing')),
      type: 'website',
      locale: openGraphLocale(locale),
      siteName: getDictionary(locale).site.name,
    },
    twitter: { card: 'summary_large_image', title: meta.title, description: meta.description },
    alternates: {
      canonical: localePath(locale, '/pricing'),
      languages: languageAlternates('/pricing'),
    },
  };
}

export function PricingPageBody({ locale }: { locale: Locale }) {
  const content = CONTENT[locale];
  const catalog = getPlanCatalog(locale);
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: content.meta.title,
    description: content.meta.description,
    url: absoluteUrl(localePath(locale, '/pricing')),
    inLanguage: locale === 'he' ? 'he-IL' : 'en-GB',
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/</g, '\\u003c') }}
      />
      <SiteHeader locale={locale} showLanguageSwitch />
      <main id="main" className="flex-1">
        <Section as="div" spacing="sm">
          <Container width="wide">
            <div className="mx-auto max-w-3xl text-center">
              <p className="text-eyebrow text-accent-strong font-semibold">{content.eyebrow}</p>
              {/* On load, not on scroll: this heading is the first thing above the fold,
                  and a scroll trigger on something already in view would either fire at
                  once or never fire at all. */}
              <h1 className="text-display text-primary mt-4 font-bold">
                <WrittenHeading text={content.title} />
              </h1>
              <p className="text-lead text-muted-foreground mt-5 leading-relaxed">{content.lead}</p>
            </div>

            <section className="mt-12" aria-labelledby="plan-comparison-title">
              <h2 id="plan-comparison-title" className="text-h3 text-primary font-semibold">
                {content.comparisonTitle}
              </h2>
              <p className="text-foreground mt-4 max-w-3xl leading-relaxed">
                {content.comparisonLead}
              </p>
              <div className="border-border mt-6 overflow-x-auto rounded-xl border">
                <table className="w-full text-start text-sm">
                  <caption className="sr-only">{content.comparisonTitle}</caption>
                  <thead className="bg-secondary/25">
                    <tr>
                      {content.columns.map((column) => (
                        <th key={column} scope="col" className="p-4 text-start">
                          {column}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {catalog.map((plan, index) => (
                      <tr key={plan.code} className="border-border border-t">
                        <th scope="row" className="p-4 text-start">
                          {plan.name}
                        </th>
                        <td className="p-4 whitespace-nowrap">
                          {formatPlanPrice(plan.priceAgorot)}
                        </td>
                        <td className="p-4">
                          {plan.attendeeLimit.toLocaleString(locale === 'he' ? 'he-IL' : 'en-GB')}
                        </td>
                        <td className="min-w-48 p-4 leading-relaxed">
                          {content.suitability[index]}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {/* No `.reveal` here: the grid inside staggers its own cards, and a reveal
                on the wrapper would fade the whole block in first and then fade each
                card in again inside it. */}
            <div className="mt-12">
              <PricingCards locale={locale} headingLevel="h2" />
            </div>

            <section className="mt-12" aria-labelledby="plan-preparation-title">
              <h2 id="plan-preparation-title" className="text-h3 text-primary font-semibold">
                {content.preparationTitle}
              </h2>
              <ul className="mt-5 list-disc space-y-3 ps-5 leading-relaxed">
                {content.preparation.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              <Link
                href={localePath(locale, '/accessibility')}
                className="text-primary mt-5 inline-flex py-2 underline underline-offset-4"
              >
                {content.accessLink}
              </Link>
            </section>

            <section className="reveal border-border bg-card/70 shadow-paper mt-14 rounded-3xl border p-7 text-center sm:p-10">
              <SectionHeader title={content.howTitle} />
              <ol className="text-muted-foreground mx-auto mt-8 grid max-w-4xl gap-5 text-start sm:grid-cols-3">
                {content.steps.map((step, index) => (
                  <li
                    key={step.title}
                    className="border-border bg-background/70 relative rounded-2xl border p-5 pt-6"
                  >
                    <span
                      aria-hidden="true"
                      className="bg-primary text-primary-foreground absolute start-5 -top-3.5 flex size-7 items-center justify-center rounded-full font-[family-name:var(--font-display)] text-sm font-bold"
                    >
                      {index + 1}
                    </span>
                    <strong className="text-foreground block">{step.title}</strong>
                    <span className="mt-1 block text-sm leading-relaxed">{step.body}</span>
                  </li>
                ))}
              </ol>
              <div className="mt-8 flex flex-wrap justify-center gap-3">
                <Link href={localePath(locale, '/signup')} className={buttonClass({ size: 'lg' })}>
                  {content.startCta}
                </Link>
                <Link
                  href={localePath(locale, '/')}
                  className={buttonClass({ variant: 'ghost', size: 'lg' })}
                >
                  {content.homeCta}
                </Link>
              </div>
            </section>
          </Container>
        </Section>
      </main>
    </>
  );
}
