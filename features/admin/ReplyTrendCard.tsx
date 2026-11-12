'use client';

import { useRef, useState, type KeyboardEvent } from 'react';

import { Icon } from '@/components/ui/icons';
import { EVENT_TIMEZONE } from '@/config/event.config';
import { eventZoneInstant } from '@/lib/eventDate';
import { cn } from '@/lib/utils';
import type { ReplyTrend, ReplyTrendDay } from '@/services/rsvpStats';

/**
 * How fast the replies are arriving (§8).
 *
 * Every other figure on the event page is a total, and a total cannot tell a host the
 * one thing they keep opening the page to find out: is this still moving? "Forty
 * replies" reads the same whether the last one came an hour ago or nine days ago, and
 * those are opposite situations — one means wait, the other means send the reminder.
 *
 * So: one column per day for the last fortnight, in one colour, with the figure that
 * summarises them set large beside it. A column chart rather than a line because a day
 * with no replies is the most informative value on it, and a line would draw straight
 * through the gap as though something had happened there.
 *
 * Three decisions about reading it:
 *
 *   - **Time runs left to right in both languages.** The page is right-to-left, but a
 *     time axis is not prose; the last column is today and is labelled so.
 *   - **Only two columns are labelled** — the busiest day and today. A number on every
 *     column is fourteen numbers nobody reads; the rest are one hover, one arrow key or
 *     one tap on "show as a table" away.
 *   - **The values never depend on hovering.** The readout above the chart follows the
 *     pointer and the keyboard, and the table under it lists every day outright.
 */

const dayMonth = new Intl.DateTimeFormat('he-IL', {
  day: 'numeric',
  month: 'numeric',
  timeZone: EVENT_TIMEZONE,
});

const weekday = new Intl.DateTimeFormat('he-IL', { weekday: 'long', timeZone: EVENT_TIMEZONE });

/** `2026-08-14` → `יום שישי, 14.8`. Noon, so no zone arithmetic can move the date. */
function describeDay(isoDate: string): string {
  const instant = eventZoneInstant(isoDate, '12:00:00');
  return `${weekday.format(instant)}, ${dayMonth.format(instant)}`;
}

const shortDay = (isoDate: string): string =>
  dayMonth.format(eventZoneInstant(isoDate, '12:00:00'));

/** Hebrew counts one differently from many, and none differently from both. */
function countReplies(count: number): string {
  if (count === 0) return 'אין תשובות';
  if (count === 1) return 'תשובה אחת';
  return `${count} תשובות`;
}

export function ReplyTrendCard({ trend }: { trend: ReplyTrend }) {
  const { days, total, peak } = trend;
  const today = days.at(-1);
  const [active, setActive] = useState(days.length - 1);
  const columns = useRef<(HTMLButtonElement | null)[]>([]);

  if (today === undefined) return null;

  const tallest = Math.max(1, peak?.replies ?? 0);
  const shown: ReplyTrendDay = days[active] ?? today;

  /*
   * Arrow keys move along the columns; only the current one is in the tab order.
   *
   * Fourteen tab stops in front of the reply list would make every keyboard user walk
   * the whole chart to reach it. One stop, then arrows, is the pattern a toolbar uses —
   * and the keys are physical here, not logical, because the axis is: left is earlier.
   */
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const step = event.key === 'ArrowLeft' ? -1 : event.key === 'ArrowRight' ? 1 : 0;
    if (step === 0) return;
    event.preventDefault();
    const next = Math.min(days.length - 1, Math.max(0, active + step));
    setActive(next);
    columns.current[next]?.focus();
  };

  return (
    <section
      aria-labelledby="reply-pace"
      className="border-border bg-card shadow-paper mt-3 rounded-2xl border p-5 sm:p-6"
    >
      <div className="flex flex-col gap-6 lg:flex-row lg:items-stretch lg:gap-10">
        <div className="shrink-0 lg:w-60">
          <h2 id="reply-pace" className="text-primary flex items-center gap-2 font-semibold">
            <Icon name="trending" className="text-accent-strong size-5" />
            קצב התשובות
          </h2>
          <p className="text-primary mt-3 font-[family-name:var(--font-display)] text-4xl leading-none font-bold tabular-nums sm:text-5xl">
            {total}
          </p>
          <p className="text-muted-foreground mt-2 text-sm">
            תשובות ב-{days.length} הימים האחרונים
          </p>
          <dl className="mt-4 space-y-1.5 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">היום</dt>
              <dd className="text-primary font-semibold">{countReplies(today.replies)}</dd>
            </div>
            {peak !== null && (
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">היום העמוס ביותר</dt>
                <dd className="text-primary font-semibold">
                  {countReplies(peak.replies)}{' '}
                  <span className="text-muted-foreground font-normal">({shortDay(peak.date)})</span>
                </dd>
              </div>
            )}
          </dl>
        </div>

        <div className="min-w-0 flex-1">
          {total === 0 ? (
            <p className="text-muted-foreground border-border flex h-full min-h-32 items-center justify-center rounded-xl border border-dashed px-4 text-center text-sm leading-relaxed">
              לא התקבלו תשובות ב-{days.length} הימים האחרונים. שליחת תזכורת למי שטרם ענה היא בדרך
              כלל מה שמחזיר את הקצב.
            </p>
          ) : (
            <>
              {/* The readout: what the pointer or the keyboard is on, today by default. */}
              <p aria-hidden="true" className="text-sm">
                <span className="text-primary font-semibold">{countReplies(shown.replies)}</span>
                <span className="text-muted-foreground"> · {describeDay(shown.date)}</span>
              </p>

              <div
                role="group"
                aria-label="תשובות לפי יום, מהמוקדם למאוחר. מקשי החיצים עוברים בין הימים."
                dir="ltr"
                onKeyDown={onKeyDown}
                onPointerLeave={() => setActive(days.length - 1)}
                className="border-border-strong mt-3 flex h-36 items-stretch border-b"
              >
                {days.map((day, index) => {
                  const height = (day.replies / tallest) * 100;
                  const labelled =
                    day.replies > 0 && (day.date === peak?.date || index === days.length - 1);
                  return (
                    <button
                      key={day.date}
                      ref={(node) => {
                        columns.current[index] = node;
                      }}
                      type="button"
                      tabIndex={index === active ? 0 : -1}
                      aria-label={`${describeDay(day.date)}: ${countReplies(day.replies)}`}
                      onPointerEnter={() => setActive(index)}
                      onFocus={() => setActive(index)}
                      /*
                       * The whole slot is the target, full height, not the painted bar: a
                       * day with one reply is a sliver, and a day with none is nothing at
                       * all — both still have to answer a pointer.
                       *
                       * The top padding is the label's room. It is reserved on every
                       * column, labelled or not, so a value means the same height
                       * wherever it falls: when the label took its space out of the bar
                       * instead, the busiest day was drawn shorter than its equal.
                       */
                      className="group flex min-w-0 flex-1 cursor-default flex-col items-center justify-end rounded-t-md px-px pt-5 focus-visible:outline-offset-0"
                    >
                      <span
                        className={cn(
                          'relative w-full max-w-6 rounded-t-[4px] transition-colors duration-[--duration-fast] [print-color-adjust:exact]',
                          index === active ? 'bg-primary' : 'bg-primary/70 group-hover:bg-primary',
                        )}
                        style={{
                          // A day with replies always shows, however small beside the peak.
                          height: day.replies === 0 ? 0 : `max(3px, ${height.toFixed(2)}%)`,
                        }}
                      >
                        {labelled && (
                          <span className="text-primary absolute bottom-full left-1/2 mb-1 -translate-x-1/2 text-xs leading-none font-semibold tabular-nums">
                            {day.replies}
                          </span>
                        )}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div
                aria-hidden="true"
                dir="ltr"
                className="text-muted-foreground mt-1.5 flex justify-between text-xs tabular-nums"
              >
                <span>{shortDay(days[0]!.date)}</span>
                <span>היום</span>
              </div>
            </>
          )}
        </div>
      </div>

      {total > 0 && (
        <details className="mt-4 print:hidden">
          <summary className="text-muted-foreground hover:text-primary inline-flex min-h-9 cursor-pointer items-center rounded-md text-sm underline underline-offset-4">
            הצגת הנתונים כטבלה
          </summary>
          <table className="mt-3 w-full max-w-sm text-sm">
            <caption className="sr-only">תשובות שהתקבלו בכל יום</caption>
            <thead>
              <tr className="text-muted-foreground border-border border-b text-start">
                <th scope="col" className="py-1.5 text-start font-medium">
                  יום
                </th>
                <th scope="col" className="py-1.5 text-start font-medium">
                  תשובות
                </th>
              </tr>
            </thead>
            <tbody>
              {days.map((day) => (
                <tr key={day.date} className="border-border/70 border-b">
                  <th scope="row" className="py-1.5 text-start font-normal">
                    {describeDay(day.date)}
                  </th>
                  <td className="py-1.5 tabular-nums">{day.replies}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </details>
      )}
    </section>
  );
}
