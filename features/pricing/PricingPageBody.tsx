import type { Metadata } from 'next';
import Link from 'next/link';

import { buttonClass } from '@/components/ui/button';
import { Container, Section, SectionHeader } from '@/components/ui/layout';
import { SiteHeader } from '@/features/layout/SiteHeader';
import { PricingCards } from '@/features/pricing/PricingCards';
import { languageAlternates, localePath, type Locale } from '@/lib/i18n';

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
  },
  en: {
    meta: {
      title: 'Pricing for event RSVPs',
      description: 'Basic at ₪99, Premium at ₪199 or Pro at ₪349 — paid once, per event.',
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
  },
};

export function buildPricingMetadata(locale: Locale): Metadata {
  const { meta } = CONTENT[locale];
  return {
    title: meta.title,
    description: meta.description,
    alternates: {
      canonical: localePath(locale, '/pricing'),
      languages: languageAlternates('/pricing'),
    },
  };
}

export function PricingPageBody({ locale }: { locale: Locale }) {
  const content = CONTENT[locale];

  return (
    <>
      <SiteHeader locale={locale} showLanguageSwitch />
      <main id="main" className="flex-1">
        <Section as="div" spacing="sm">
          <Container width="wide">
            <div className="mx-auto max-w-3xl text-center">
              <p className="text-eyebrow text-accent-strong font-semibold">{content.eyebrow}</p>
              <h1 className="text-display text-primary mt-4 font-bold">{content.title}</h1>
              <p className="text-lead text-muted-foreground mt-5 leading-relaxed">{content.lead}</p>
            </div>

            <div className="mt-12">
              <PricingCards locale={locale} />
            </div>

            <section className="border-border bg-card/60 mt-14 rounded-2xl border p-7 text-center sm:p-10">
              <SectionHeader title={content.howTitle} />
              <ol className="text-muted-foreground mx-auto mt-6 grid max-w-4xl gap-5 text-start sm:grid-cols-3">
                {content.steps.map((step) => (
                  <li key={step.title}>
                    <strong className="text-foreground block">{step.title}</strong>
                    {step.body}
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
