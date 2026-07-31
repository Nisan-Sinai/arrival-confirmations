import type { Metadata } from 'next';
import Link from 'next/link';

import { buttonClass } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Container } from '@/components/ui/layout';
import { appConfig } from '@/config/event.config';
import { AuthFragmentNotice } from '@/features/auth/AuthFragmentNotice';
import { SiteHeader } from '@/features/layout/SiteHeader';
import { PricingCards } from '@/features/pricing/PricingCards';
import { SITE_ORIGIN } from '@/lib/seo';

export const metadata: Metadata = {
  title: { absolute: 'אישורי הגעה לאירועים | ניסן סיני טכנולוגיות' },
  description:
    'הזמנה דיגיטלית ואישורי הגעה לאירועים. מתחילים בבדיקה חינמית ובוחרים Basic ב-99 ₪ או Premium ב-199 ₪ בתשלום חד-פעמי.',
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    locale: 'he_IL',
    siteName: appConfig.siteName,
    title: 'אישורי הגעה לאירועים | ניסן סיני טכנולוגיות',
    description: 'יוצרים הזמנה, בודקים בחינם ומפעילים מסלול בתשלום חד-פעמי לאירוע.',
    url: '/',
  },
};

const FAQ = [
  {
    q: 'אפשר לבדוק לפני שמשלמים?',
    a: 'כן. יוצרים אירוע מלא וניתן לקבל עד 10 אישורי הגעה לבדיקה. תשלום נדרש רק להפעלה רחבה יותר.',
  },
  {
    q: 'זה מנוי חודשי?',
    a: 'לא. התשלום הוא חד-פעמי לכל אירוע, ללא התחייבות וללא חיוב מתחדש.',
  },
  {
    q: 'איך משלמים?',
    a: 'יוצרים קשר בטלפון או ב-WhatsApp ומשלמים ישירות. לאחר מכן מנהל המערכת מפעיל את המסלול לאירוע.',
  },
  {
    q: 'האורחים צריכים להירשם?',
    a: 'לא. האורחים פותחים את הקישור, ממלאים את הפרטים ומאשרים הגעה בלי חשבון ובלי התקנה.',
  },
] as const;

const STRUCTURED_DATA = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebApplication',
      name: appConfig.siteName,
      description: appConfig.siteDescription,
      url: SITE_ORIGIN,
      applicationCategory: 'LifestyleApplication',
      operatingSystem: 'Web',
      inLanguage: 'he-IL',
      isAccessibleForFree: true,
      offers: [
        { '@type': 'Offer', name: 'Basic', price: '99', priceCurrency: 'ILS' },
        { '@type': 'Offer', name: 'Premium', price: '199', priceCurrency: 'ILS' },
      ],
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

const BENEFITS = [
  {
    title: 'הזמנה דיגיטלית מעוצבת',
    body: 'תאריך עברי, ספירה לאחור, Waze ו-Google Maps בדף שנראה כמו הזמנה ולא כמו טופס.',
  },
  {
    title: 'דשבורד בזמן אמת',
    body: 'רואים מי מגיע, כמה מבוגרים וילדים, דרישות תזונה והערות — מכל טלפון.',
  },
  {
    title: 'עברית ו-RTL מהיסוד',
    body: 'הטפסים, הטבלאות והמסכים נבנו במיוחד לקהל הישראלי ולשימוש נוח ב-WhatsApp.',
  },
] as const;

export default function LandingPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(STRUCTURED_DATA).replace(/</g, '\\u003c'),
        }}
      />
      <SiteHeader />
      <main id="main" className="flex flex-1 flex-col">
        <div className="px-5 pt-5 empty:hidden">
          <AuthFragmentNotice />
        </div>

        <section className="from-secondary/45 relative overflow-hidden bg-gradient-to-b to-transparent py-16 sm:py-24">
          <Container width="wide">
            <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr]">
              <div className="text-center lg:text-start">
                <p className="text-eyebrow text-accent-strong font-semibold">
                  אישורי הגעה לאירועים
                </p>
                <h1 className="text-display text-primary mt-5 font-bold">
                  מנהלים את המוזמנים
                  <span className="text-accent-strong block">בלי לרדוף אחרי תשובות</span>
                </h1>
                <p className="text-lead text-muted-foreground mt-6 max-w-2xl leading-relaxed lg:mx-0">
                  יוצרים הזמנה דיגיטלית, משתפים ב-WhatsApp ורואים את כל אישורי ההגעה במקום אחד.
                  מתחילים בבדיקה חינמית ומשלמים רק כשמפעילים את האירוע.
                </p>
                <div className="mt-9 flex flex-wrap justify-center gap-3 lg:justify-start">
                  <Link href="/signup" className={buttonClass({ size: 'lg' })}>
                    יצירת אירוע לבדיקה
                  </Link>
                  <Link href="/pricing" className={buttonClass({ variant: 'outline', size: 'lg' })}>
                    צפייה במסלולים
                  </Link>
                </div>
                <ul className="text-muted-foreground mt-8 flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm lg:justify-start">
                  {['10 אישורים לבדיקה', 'תשלום חד-פעמי', 'בלי חיוב חודשי'].map((fact) => (
                    <li key={fact} className="flex items-center gap-2">
                      <span aria-hidden="true" className="bg-accent-strong size-1.5 rounded-full" />
                      {fact}
                    </li>
                  ))}
                </ul>
              </div>

              <Card variant="ink" padding="lg" className="overflow-hidden">
                <p className="text-accent text-sm font-semibold">מה קורה אחרי ששולחים את הקישור?</p>
                <div className="mt-7 space-y-6">
                  {[
                    ['01', 'האורח פותח מה-WhatsApp', 'אין צורך בהרשמה או בהתקנת אפליקציה.'],
                    ['02', 'ממלא אישור הגעה', 'שם, טלפון, מספר מגיעים והעדפות חשובות.'],
                    ['03', 'התשובה מופיעה בדשבורד', 'הנתונים מתעדכנים מיד ומוכנים לסיכום ולייצוא.'],
                  ].map(([number, title, body]) => (
                    <div key={number} className="flex gap-4">
                      <span className="border-accent/50 text-accent flex size-10 shrink-0 items-center justify-center rounded-full border text-sm font-bold">
                        {number}
                      </span>
                      <div>
                        <h2 className="font-semibold">{title}</h2>
                        <p className="mt-1 text-sm leading-relaxed text-white/70">{body}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </Container>
        </section>

        <section className="py-16 sm:py-20">
          <Container width="wide">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-eyebrow text-accent-strong font-semibold">מה מקבלים</p>
              <h2 className="text-h1 text-primary mt-3 font-bold">כל מה שצריך לאירוע מסודר</h2>
            </div>
            <div className="mt-10 grid gap-5 md:grid-cols-3">
              {BENEFITS.map((benefit) => (
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
              <p className="text-eyebrow text-accent-strong font-semibold">מסלולים</p>
              <h2 className="text-h1 text-primary mt-3 font-bold">
                מתחילים בחינם, מפעילים כשמוכנים
              </h2>
              <p className="text-muted-foreground mt-4 leading-relaxed">
                Basic ב-99 ₪ או Premium ב-199 ₪ — תשלום חד-פעמי לאירוע.
              </p>
            </div>
            <div className="mt-11">
              <PricingCards />
            </div>
          </Container>
        </section>

        <section className="py-16 sm:py-20">
          <Container>
            <div className="mx-auto max-w-3xl">
              <p className="text-eyebrow text-accent-strong text-center font-semibold">
                שאלות נפוצות
              </p>
              <h2 className="text-h1 text-primary mt-3 text-center font-bold">לפני שמתחילים</h2>
              <div className="mt-9 space-y-3">
                {FAQ.map((item) => (
                  <details key={item.q} className="border-border bg-card rounded-xl border px-5">
                    <summary className="text-primary cursor-pointer list-none py-4 font-semibold">
                      {item.q}
                    </summary>
                    <p className="text-muted-foreground pb-5 leading-relaxed">{item.a}</p>
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
