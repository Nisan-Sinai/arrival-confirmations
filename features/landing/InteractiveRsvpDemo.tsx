'use client';

import { useState } from 'react';
import Link from 'next/link';

import { buttonClass } from '@/components/ui/button';
import { Icon } from '@/components/ui/icons';
import { localePath, type Locale } from '@/lib/i18n';

type Answer = 'yes' | 'maybe' | 'no';

const COPY = {
  he: {
    eyebrow: 'לראות את זה עובד',
    title: 'מהצד של האורח. ומהצד שלכם.',
    intro:
      'לא צריך לנחש איך זה מרגיש. בחרו תשובה להזמנה וראו איך היא משנה מיד את תמונת המצב של האירוע.',
    sample: 'הדגמה אינטראקטיבית · ללא שמירת נתונים',
    invite: 'ההזמנה לדוגמה',
    welcome: 'מתרגשים לחגוג איתכם',
    names: 'נועה ואיתי',
    wedding: 'שמחים להזמינכם לחתונה שלנו',
    venue: 'אולמי הדר · 19:00',
    date: 'י״ד באלול',
    rsvpQuestion: 'האם תגיעו לחגוג איתנו?',
    yes: 'בשמחה, מגיעים!',
    maybe: 'עדיין לא בטוחים',
    no: 'לצערנו לא נוכל',
    guests: 'כמה מגיעים?',
    people: 'אורחים',
    answerSaved: 'התשובה שלכם התעדכנה בהדגמה',
    dashboard: 'בצד שלכם',
    dashboardTitle: 'תמונת מצב ברורה, במקום אחד',
    demoStats: 'נתונים להמחשה בלבד — אינם נתוני לקוחות',
    attending: 'מגיעים',
    considering: 'מתלבטים',
    declining: 'לא מגיעים',
    selected: 'התשובה שלכם',
    selectedYes: 'מגיעים',
    selectedMaybe: 'מתלבטים',
    selectedNo: 'לא מגיעים',
    instant: 'הדשבורד משתנה מיד כשמשנים את התשובה',
    cta: 'רוצים לנסות עם האירוע שלכם?',
    footnote: 'אפשר ליצור אירוע בדיקה בחינם, בלי כרטיס אשראי.',
  },
  en: {
    eyebrow: 'See it in action',
    title: 'For your guests. And for you.',
    intro:
      'Try the invitation yourself. Choose a response and watch your event overview update immediately.',
    sample: 'Interactive demo · no information is stored',
    invite: 'Sample invitation',
    welcome: 'We can’t wait to celebrate with you',
    names: 'Noa & Itay',
    wedding: 'You’re invited to our wedding',
    venue: 'Hadar Hall · 19:00',
    date: '14 Elul',
    rsvpQuestion: 'Will you celebrate with us?',
    yes: 'Yes, we’ll be there!',
    maybe: 'Not sure yet',
    no: 'Sorry, we can’t',
    guests: 'How many of you?',
    people: 'guests',
    answerSaved: 'Your sample reply has been updated',
    dashboard: 'Your view',
    dashboardTitle: 'All your replies, one clear picture',
    demoStats: 'Illustrative numbers only — not real customer data',
    attending: 'Attending',
    considering: 'Undecided',
    declining: 'Not attending',
    selected: 'Your response',
    selectedYes: 'Attending',
    selectedMaybe: 'Undecided',
    selectedNo: 'Not attending',
    instant: 'The overview changes as soon as you respond',
    cta: 'Try it with your own event',
    footnote: 'Create a free trial event, no credit card needed.',
  },
} as const;

const RESPONSES: readonly { answer: Answer; icon: 'check-circle' | 'clock' | 'x' }[] = [
  { answer: 'yes', icon: 'check-circle' },
  { answer: 'maybe', icon: 'clock' },
  { answer: 'no', icon: 'x' },
];

export function InteractiveRsvpDemo({ locale }: { locale: Locale }) {
  const copy = COPY[locale];
  const [answer, setAnswer] = useState<Answer>('yes');
  const [guests, setGuests] = useState(2);

  // The 42/6/4 baseline is a clearly-labelled illustrative dataset. No database
  // queries, analytics, mutations or user information are involved in this demo.
  const totals = {
    yes: 42 + (answer === 'yes' ? guests : 0),
    maybe: 6 + (answer === 'maybe' ? 1 : 0),
    no: 4 + (answer === 'no' ? 1 : 0),
  };
  const max = totals.yes + totals.maybe + totals.no;
  const selectedLabel =
    answer === 'yes' ? copy.selectedYes : answer === 'maybe' ? copy.selectedMaybe : copy.selectedNo;

  const stats = [
    { key: 'yes' as const, label: copy.attending, value: totals.yes, color: 'bg-emerald-600' },
    { key: 'maybe' as const, label: copy.considering, value: totals.maybe, color: 'bg-amber-500' },
    { key: 'no' as const, label: copy.declining, value: totals.no, color: 'bg-rose-500' },
  ];

  return (
    <section
      id="demo"
      aria-labelledby="demo-heading"
      className="relative overflow-hidden bg-[#f5f0eb] py-20 sm:py-28"
    >
      <div
        className="pointer-events-none absolute -top-52 -left-28 size-[28rem] rounded-full bg-[#eac49d]/25 blur-3xl"
        aria-hidden="true"
      />
      <div className="relative mx-auto w-full max-w-[84rem] px-5 sm:px-8">
        <div className="mx-auto mb-12 max-w-3xl text-center sm:mb-16">
          <p className="text-accent-strong mb-4 text-sm font-bold tracking-[0.1em]">
            {copy.eyebrow}
          </p>
          <h2
            id="demo-heading"
            className="text-primary text-3xl font-bold tracking-tight sm:text-5xl"
          >
            {copy.title}
          </h2>
          <p className="text-muted-foreground mx-auto mt-5 max-w-2xl text-base leading-8 sm:text-lg">
            {copy.intro}
          </p>
          <span className="text-muted-foreground mt-6 inline-flex items-center gap-2 rounded-full border border-[#d3c5bb] bg-white/80 px-4 py-2 text-xs font-medium">
            <Icon name="sparkles" className="size-4" /> {copy.sample}
          </span>
        </div>

        <div className="grid items-stretch gap-6 lg:grid-cols-2 lg:gap-10">
          <div className="relative min-w-0 rounded-[2rem] border border-[#eadbd0] bg-white p-4 shadow-[0_20px_60px_-30px_rgba(69,28,38,0.2)] sm:p-8">
            <div className="mb-6 flex items-center justify-between gap-4">
              <span className="text-primary inline-flex items-center gap-2 text-sm font-bold">
                <span className="flex size-9 items-center justify-center rounded-full bg-[#f4e6d8]">
                  <Icon name="heart" className="size-5" />
                </span>
                {copy.invite}
              </span>
              <span
                className="size-2 animate-pulse rounded-full bg-emerald-500"
                aria-hidden="true"
              />
            </div>
            <div className="relative overflow-hidden rounded-[1.5rem] border border-[#d8c4ad] bg-[#faf6f0] px-5 py-9 text-center sm:px-9">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-3 rounded-[1rem] border border-[#dbc7a7]/70"
              />
              <p className="relative text-xs font-bold tracking-[0.28em] text-[#96713f]">✦</p>
              <p className="relative mt-4 text-sm text-[#765a5d]">{copy.welcome}</p>
              <h3 className="relative mt-2 font-[family-name:var(--font-display)] text-4xl font-bold text-[#582634] sm:text-5xl">
                {copy.names}
              </h3>
              <p className="relative mt-3 text-sm text-[#765a5d]">{copy.wedding}</p>
              <div className="relative mx-auto my-7 h-px max-w-44 bg-[#c8aa7b]" />
              <div className="relative flex flex-wrap justify-center gap-4 text-sm font-semibold text-[#582634]">
                <span>{copy.date}</span>
                <span aria-hidden="true">•</span>
                <span>{copy.venue}</span>
              </div>
            </div>
            <div className="mt-7">
              <h4 className="text-primary text-center text-lg font-bold">{copy.rsvpQuestion}</h4>
              <div className="mt-5 grid gap-2 sm:grid-cols-3" aria-label={copy.rsvpQuestion}>
                {RESPONSES.map(({ answer: item, icon }) => (
                  <button
                    key={item}
                    type="button"
                    aria-pressed={answer === item}
                    onClick={() => setAnswer(item)}
                    className={
                      'flex min-h-12 items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#703546] ' +
                      (answer === item
                        ? 'border-[#622f40] bg-[#622f40] text-white shadow-sm'
                        : 'border-[#e2d6d0] bg-white text-[#624650] hover:bg-[#f8f0ec]')
                    }
                  >
                    <Icon name={icon} className="size-4" />
                    {copy[item]}
                  </button>
                ))}
              </div>
              {answer === 'yes' && (
                <div className="mt-5 flex items-center justify-between rounded-xl bg-[#faf5f1] p-3">
                  <span className="text-primary text-sm font-semibold">{copy.guests}</span>
                  <div className="flex items-center gap-4">
                    <button
                      type="button"
                      aria-label={locale === 'he' ? 'הפחתת מספר אורחים' : 'Decrease guests'}
                      disabled={guests <= 1}
                      onClick={() => setGuests((current) => Math.max(1, current - 1))}
                      className="flex size-9 items-center justify-center rounded-full border border-[#d4bfb2] bg-white disabled:opacity-40"
                    >
                      <Icon name="minus" className="size-4" />
                    </button>
                    <span
                      className="text-primary min-w-4 text-center font-bold tabular-nums"
                      aria-live="polite"
                    >
                      {guests}
                    </span>
                    <button
                      type="button"
                      aria-label={locale === 'he' ? 'הגדלת מספר אורחים' : 'Increase guests'}
                      disabled={guests >= 10}
                      onClick={() => setGuests((current) => Math.min(10, current + 1))}
                      className="flex size-9 items-center justify-center rounded-full border border-[#d4bfb2] bg-white disabled:opacity-40"
                    >
                      <Icon name="plus" className="size-4" />
                    </button>
                  </div>
                </div>
              )}
              <p
                role="status"
                className="mt-4 flex min-h-6 items-center justify-center gap-2 text-center text-xs text-emerald-700"
              >
                <Icon name="check-circle" className="size-4" /> {copy.answerSaved}
              </p>
            </div>
          </div>

          <div className="min-w-0 rounded-[2rem] bg-[#341d27] p-5 text-white shadow-[0_20px_60px_-25px_rgba(37,17,26,0.35)] sm:p-8">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/15 pb-6">
              <div>
                <p className="text-xs font-semibold tracking-wider text-[#e1bb85]">
                  {copy.dashboard}
                </p>
                <h3 className="mt-2 text-xl font-bold sm:text-2xl">{copy.dashboardTitle}</h3>
              </div>
              <span className="rounded-full border border-white/15 bg-white/10 p-3">
                <Icon name="dashboard" className="size-6 text-[#edca95]" />
              </span>
            </div>
            <div className="mt-6 grid grid-cols-3 gap-2 sm:gap-4">
              {stats.map((stat) => (
                <div
                  key={stat.key}
                  className="rounded-2xl border border-white/10 bg-white/[0.07] p-3 sm:p-5"
                >
                  <span className="text-3xl font-bold tabular-nums sm:text-4xl">{stat.value}</span>
                  <span className="mt-2 block text-xs text-white/75 sm:text-sm">{stat.label}</span>
                  <div
                    className={'mt-5 h-1.5 w-10 rounded-full ' + stat.color}
                    aria-hidden="true"
                  />
                </div>
              ))}
            </div>
            <div className="mt-7 rounded-2xl border border-white/10 bg-white/[0.05] p-5 sm:p-6">
              <p className="text-sm font-semibold">{copy.dashboardTitle}</p>
              <div className="mt-6 space-y-5">
                {stats.map((stat) => (
                  <div key={stat.key}>
                    <div className="mb-2 flex items-center justify-between text-sm">
                      <span className="text-white/80">{stat.label}</span>
                      <span className="font-semibold tabular-nums">
                        {Math.round((stat.value / max) * 100)}%
                      </span>
                    </div>
                    <div className="h-2.5 overflow-hidden rounded-full bg-white/10">
                      <div
                        className={
                          'h-full rounded-full transition-[width] duration-300 ' + stat.color
                        }
                        style={{ width: `${(stat.value / max) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-7 flex items-center justify-between gap-4 rounded-xl border border-[#e0bd83]/30 bg-[#e0bd83]/10 px-4 py-3">
                <span className="text-xs text-white/70">{copy.selected}</span>
                <span className="text-sm font-bold text-[#f2d6a5]" aria-live="polite">
                  {selectedLabel}
                  {answer === 'yes' ? ` · ${guests} ${copy.people}` : ''}
                </span>
              </div>
            </div>
            <p className="mt-5 flex items-start gap-2 text-xs leading-6 text-white/65">
              <Icon name="info" className="mt-1 size-4" /> {copy.demoStats}
            </p>
            <p className="mt-4 flex items-center gap-2 text-sm text-[#f2d6a5]">
              <Icon name="check-circle" className="size-4" /> {copy.instant}
            </p>
          </div>
        </div>

        <div className="mt-10 text-center">
          <Link
            href={localePath(locale, '/signup')}
            className={buttonClass({ size: 'lg', className: 'shadow-raised' })}
          >
            {copy.cta} <Icon name="arrow-forward" className="size-4" />
          </Link>
          <p className="text-muted-foreground mt-3 text-sm">{copy.footnote}</p>
        </div>
      </div>
    </section>
  );
}
