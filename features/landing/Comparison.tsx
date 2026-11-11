import Link from 'next/link';

import { buttonClass } from '@/components/ui/button';
import { Icon } from '@/components/ui/icons';
import { Container } from '@/components/ui/layout';
import { WrittenHeading } from '@/features/landing/WrittenHeading';
import { localePath, type Locale } from '@/lib/i18n';

/**
 * The same job, done both ways.
 *
 * The reader this is for has run an event before — out of a spreadsheet, a WhatsApp
 * group and an evening of phone calls — and does not need the product described so much
 * as placed beside what they already do. Two columns, four rows, each row the same task:
 * the difference is the argument, and it needs no adjectives.
 *
 * The left column describes a method, not a competitor. Nothing here is a claim about
 * another company's product, which is the only kind of comparison that stays true
 * without anyone having to keep checking it.
 */

type Row = { readonly before: string; readonly after: string };

const COPY: Record<
  Locale,
  {
    readonly eyebrow: string;
    readonly title: string;
    readonly lead: string;
    readonly beforeHeading: string;
    readonly afterHeading: string;
    readonly rows: readonly Row[];
    readonly cta: string;
  }
> = {
  he: {
    eyebrow: 'לפני ואחרי',
    title: 'אותו אירוע, בלי הרדיפה',
    lead: 'מי שארגן פעם אירוע מתוך גיליון, קבוצת WhatsApp וערב של טלפונים מכיר את הדרך הישנה. כך נראה אותו אירוע כשהתשובות מגיעות אליכם לבד.',
    beforeHeading: 'בדרך הישנה',
    afterHeading: 'עם אישורי הגעה',
    rows: [
      {
        before: 'רשימה בגיליון שמתעדכנת ביד אחרי כל הודעה',
        after: 'כל תשובה נכנסת לדשבורד ברגע שהאורח שולח אותה',
      },
      {
        before: 'טלפונים והודעות לכל מי שעדיין לא ענה',
        after: 'רואים מי טרם השיב ושולחים תזכורת ממוקדת',
      },
      {
        before: 'ספירת ראשים מחדש לפני כל שיחה עם האולם',
        after: 'מספר המבוגרים, הילדים ודרישות התזונה מוכן תמיד',
      },
      {
        before: 'אין דרך לדעת כמה זה יעלה עד שהרשימה סגורה',
        after: 'תשלום חד-פעמי וידוע מראש לאירוע, אחרי בדיקה חינמית',
      },
    ],
    cta: 'יצירת אירוע לבדיקה',
  },
  en: {
    eyebrow: 'Before and after',
    title: 'The same event, without the chasing',
    lead: 'Anyone who has run an event out of a spreadsheet, a WhatsApp group and an evening of phone calls knows the old way. This is the same event when the replies come to you.',
    beforeHeading: 'The old way',
    afterHeading: 'With Arrival Confirmations',
    rows: [
      {
        before: 'A spreadsheet updated by hand after every message',
        after: 'Each reply lands in the dashboard the moment a guest sends it',
      },
      {
        before: 'Calls and messages to everyone who has not answered',
        after: 'See who has not replied and send a targeted reminder',
      },
      {
        before: 'Re-counting heads before every call with the venue',
        after: 'Adults, children and dietary needs are always ready',
      },
      {
        before: 'No way to know the cost until the list is final',
        after: 'One known payment per event, after a free trial run',
      },
    ],
    cta: 'Create a trial event',
  },
};

export function Comparison({ locale }: { locale: Locale }) {
  const copy = COPY[locale];

  return (
    <section className="bg-card border-border/60 border-y py-16 sm:py-24">
      <Container width="wide">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-eyebrow text-accent-strong font-semibold">{copy.eyebrow}</p>
          <h2 className="text-h1 text-primary mt-3 font-bold">
            <WrittenHeading text={copy.title} trigger="scroll" />
          </h2>
          <p className="text-muted-foreground mt-4 leading-relaxed">{copy.lead}</p>
        </div>

        {/*
          One table-shaped grid rather than two separate cards, so each "before" sits on
          the same line as its "after" at every width. Stacked on a phone, each pair
          becomes one card with the old way struck through above the new one.
        */}
        <div className="reveal mx-auto mt-11 max-w-5xl">
          <div className="hidden grid-cols-2 gap-5 px-6 pb-3 md:grid" aria-hidden="true">
            <p className="text-muted-foreground text-sm font-semibold">{copy.beforeHeading}</p>
            <p className="text-accent-strong text-sm font-semibold">{copy.afterHeading}</p>
          </div>
          <ul className="space-y-3">
            {copy.rows.map((row) => (
              <li
                key={row.before}
                className="border-border bg-background shadow-paper grid gap-0 overflow-clip rounded-2xl border md:grid-cols-2"
              >
                <p className="text-muted-foreground flex items-start gap-3 px-5 py-4 leading-relaxed sm:px-6">
                  <span className="sr-only">{copy.beforeHeading}: </span>
                  <span
                    aria-hidden="true"
                    className="bg-destructive-soft text-destructive mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full"
                  >
                    <Icon name="x" strokeWidth={2.2} className="size-3.5" />
                  </span>
                  {row.before}
                </p>
                <p className="text-primary border-border/70 bg-accent-soft/30 flex items-start gap-3 border-t px-5 py-4 leading-relaxed font-semibold sm:px-6 md:border-s md:border-t-0">
                  <span className="sr-only">{copy.afterHeading}: </span>
                  <span
                    aria-hidden="true"
                    className="bg-success-soft text-success mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full"
                  >
                    <Icon name="check" strokeWidth={2.4} className="size-3.5" />
                  </span>
                  {row.after}
                </p>
              </li>
            ))}
          </ul>
          <div className="mt-9 text-center">
            <Link href={localePath(locale, '/signup')} className={buttonClass({ size: 'lg' })}>
              {copy.cta}
              <Icon name="arrow-forward" className="size-4" />
            </Link>
          </div>
        </div>
      </Container>
    </section>
  );
}
