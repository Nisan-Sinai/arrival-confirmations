import type { Metadata } from 'next';
import Link from 'next/link';

import { listEventTypePresets } from '@/config/eventTypes';

/**
 * The landing page.
 *
 * `/` no longer shows an event, and could not once many events coexist: there is no
 * single "the event" to render, and picking one — the newest, say — would show a
 * stranger's celebration to whoever arrived at the root. Every invitation lives at
 * its own unguessable `/e/{publicId}`, and that is the link a host sends.
 */

export const metadata: Metadata = {
  title: 'אישורי הגעה — חינם, לכל אירוע',
  description:
    'הזמנה דיגיטלית וטופס אישור הגעה לכל סוג אירוע. בלי מנוי, בלי תשלום לפי אורח, בלי הגבלת כמות.',
};

const STEPS = [
  { n: '1', title: 'יוצרים אירוע', body: 'סוג האירוע, תאריך, מקום ושעה. דקה עבודה.' },
  { n: '2', title: 'שולחים קישור', body: 'כתובת פרטית לכל אירוע, מוכנה לשליחה בוואטסאפ.' },
  { n: '3', title: 'רואים מי מגיע', body: 'האישורים נאספים לרשימה אחת, עם סיכום מספרים.' },
] as const;

export default function LandingPage() {
  const eventTypes = listEventTypePresets();

  return (
    <main id="main" className="flex flex-1 flex-col">
      <section className="from-secondary/40 bg-gradient-to-b to-transparent px-4 py-16 text-center sm:py-24">
        <p className="text-accent-foreground text-sm font-semibold tracking-wide">חינם לחלוטין</p>
        <h1 className="text-primary mt-4 font-[family-name:var(--font-display)] text-4xl leading-tight font-bold sm:text-6xl">
          אישורי הגעה לאירוע שלכם
        </h1>
        <p className="text-muted-foreground mx-auto mt-6 max-w-xl text-lg leading-relaxed">
          הזמנה דיגיטלית מעוצבת וטופס אישור הגעה, לכל סוג אירוע. בלי מנוי, בלי תשלום לפי אורח ובלי
          הגבלה על מספר ההזמנות.
        </p>
        <div className="mt-10 flex flex-wrap justify-center gap-3">
          <Link
            href="/signup"
            className="bg-primary text-primary-foreground rounded-full px-8 py-3 text-base font-semibold"
          >
            יצירת אירוע
          </Link>
          <Link
            href="/login"
            className="border-primary text-primary hover:bg-secondary/60 rounded-full border px-8 py-3 text-base font-semibold transition-colors"
          >
            כניסה לחשבון
          </Link>
        </div>
      </section>

      <section className="px-4 py-14" aria-labelledby="how">
        <h2
          id="how"
          className="text-primary text-center font-[family-name:var(--font-display)] text-2xl font-bold sm:text-3xl"
        >
          איך זה עובד
        </h2>
        <ol className="mx-auto mt-10 grid max-w-4xl gap-6 sm:grid-cols-3">
          {STEPS.map((step) => (
            <li key={step.n} className="bg-card rounded-2xl border p-6 text-center">
              <span
                className="border-accent/60 text-primary mx-auto flex size-10 items-center justify-center rounded-full border font-[family-name:var(--font-display)] text-lg font-bold"
                aria-hidden="true"
              >
                {step.n}
              </span>
              <h3 className="text-primary mt-4 text-lg font-semibold">{step.title}</h3>
              <p className="text-muted-foreground mt-2 text-base">{step.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="bg-secondary/20 px-4 py-14" aria-labelledby="types">
        <h2
          id="types"
          className="text-primary text-center font-[family-name:var(--font-display)] text-2xl font-bold sm:text-3xl"
        >
          מתאים לכל שמחה
        </h2>
        <p className="text-muted-foreground mt-3 text-center text-base">
          כל סוג אירוע מגיע עם הנוסח והתוויות המתאימים לו
        </p>
        {/* Read from the same config the invitation renders from, so this list cannot
            drift out of step with what the product actually supports. */}
        <ul className="mx-auto mt-8 flex max-w-3xl flex-wrap justify-center gap-2.5">
          {eventTypes.map((preset) => (
            <li
              key={preset.value}
              className="border-accent/40 text-primary rounded-full border bg-white/70 px-4 py-1.5 text-sm"
            >
              {preset.label}
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
