import type { Metadata } from 'next';
import Link from 'next/link';

import { buttonClass } from '@/components/ui/button';
import { Container, Section, SectionHeader } from '@/components/ui/layout';
import { SiteHeader } from '@/features/layout/SiteHeader';
import { PricingCards } from '@/features/pricing/PricingCards';

export const metadata: Metadata = {
  title: 'מחירים לאישורי הגעה לאירועים',
  description: 'מסלול Basic ב-99 ₪ ומסלול Premium ב-199 ₪, בתשלום חד-פעמי לאירוע.',
  alternates: { canonical: '/pricing' },
};

export default function PricingPage() {
  return (
    <>
      <SiteHeader />
      <main id="main" className="flex-1">
        <Section as="div" spacing="sm">
          <Container width="wide">
            <div className="mx-auto max-w-3xl text-center">
              <p className="text-eyebrow text-accent-strong font-semibold">מחיר פשוט וברור</p>
              <h1 className="text-display text-primary mt-4 font-bold">תשלום חד-פעמי לכל אירוע</h1>
              <p className="text-lead text-muted-foreground mt-5 leading-relaxed">
                מתחילים בבדיקה חינמית. רק כשמחליטים לפרסם ולקבל אישורי הגעה אמיתיים בוחרים מסלול
                ומשלמים בטלפון, ב-Bit או בהעברה.
              </p>
            </div>

            <div className="mt-12">
              <PricingCards />
            </div>

            <section className="border-border bg-card/60 mt-14 rounded-2xl border p-7 text-center sm:p-10">
              <SectionHeader title="איך ההפעלה עובדת?" />
              <ol className="text-muted-foreground mx-auto mt-6 grid max-w-4xl gap-5 text-start sm:grid-cols-3">
                <li>
                  <strong className="text-foreground block">1. יוצרים אירוע</strong>
                  מעצבים ובודקים עד 10 אישורי הגעה ללא תשלום.
                </li>
                <li>
                  <strong className="text-foreground block">2. משלמים ישירות</strong>
                  יוצרים קשר בטלפון או ב-WhatsApp ומסדירים תשלום.
                </li>
                <li>
                  <strong className="text-foreground block">3. המסלול נפתח</strong>
                  מנהל המערכת מפעיל את Basic או Premium והאירוע ממשיך מיד.
                </li>
              </ol>
              <div className="mt-8 flex flex-wrap justify-center gap-3">
                <Link href="/signup" className={buttonClass({ size: 'lg' })}>
                  התחלת בדיקה חינמית
                </Link>
                <Link href="/" className={buttonClass({ variant: 'ghost', size: 'lg' })}>
                  חזרה לדף הבית
                </Link>
              </div>
            </section>
          </Container>
        </Section>
      </main>
    </>
  );
}
