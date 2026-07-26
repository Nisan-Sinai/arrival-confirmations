'use client';

import { useEffect, useState } from 'react';

/**
 * Countdown to the event (§5).
 *
 * The target instant is computed on the server and passed in as a timestamp, so the
 * count is against Asia/Jerusalem regardless of where the guest's phone thinks it is
 * — a relative in New York must not be shown a figure eight hours out.
 *
 * Renders nothing until mounted. Server and client would otherwise disagree about
 * "now" and React would report a hydration mismatch; more practically, the first
 * painted frame would be stale by however long the HTML spent in transit.
 */

interface CountdownProps {
  /** Event start, as epoch milliseconds, already resolved in the event's zone. */
  readonly targetMs: number;
}

interface Remaining {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

function remainingFrom(targetMs: number, nowMs: number): Remaining | null {
  const delta = targetMs - nowMs;
  if (delta <= 0) return null;
  return {
    days: Math.floor(delta / 86_400_000),
    hours: Math.floor((delta / 3_600_000) % 24),
    minutes: Math.floor((delta / 60_000) % 60),
    seconds: Math.floor((delta / 1000) % 60),
  };
}

/**
 * Hebrew inflects for one and for two, so a bare plural is wrong twice over: "1
 * ימים" and "2 ימים" both read as mistakes to a native speaker. `two` is the dual
 * form where the language has a distinct one.
 */
const UNITS: ReadonlyArray<{
  key: keyof Remaining;
  one: string;
  two: string;
  many: string;
}> = [
  { key: 'days', one: 'יום', two: 'יומיים', many: 'ימים' },
  { key: 'hours', one: 'שעה', two: 'שעתיים', many: 'שעות' },
  { key: 'minutes', one: 'דקה', two: 'דקות', many: 'דקות' },
  { key: 'seconds', one: 'שנייה', two: 'שניות', many: 'שניות' },
];

/** The dual carries the count itself, so "2 יומיים" would say two twice. */
function unitLabel(value: number, unit: (typeof UNITS)[number]): string {
  if (value === 1) return unit.one;
  if (value === 2) return unit.two;
  return unit.many;
}

export function Countdown({ targetMs }: CountdownProps) {
  /**
   * `null` means "not yet mounted", which is also the first server render — so the
   * two agree and there is no hydration mismatch to suppress.
   *
   * Both values are set from inside the interval callback rather than synchronously
   * in the effect body: a `setState` during an effect schedules a second render
   * before the browser paints, and doing it on every mount of every countdown is a
   * cascade for no gain. The first tick lands within a second, which is invisible
   * next to a date months away.
   */
  const [remaining, setRemaining] = useState<Remaining | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const tick = () => {
      setRemaining(remainingFrom(targetMs, Date.now()));
      setMounted(true);
    };
    // Run once on the next frame, then every second.
    const first = requestAnimationFrame(tick);
    const id = setInterval(tick, 1000);
    return () => {
      cancelAnimationFrame(first);
      clearInterval(id);
    };
  }, [targetMs]);

  if (!mounted) return null;

  if (remaining === null) {
    return (
      <p className="text-primary text-center text-lg font-semibold">היום חוגגים! מחכים לכם 💙</p>
    );
  }

  return (
    <div
      className="flex items-stretch justify-center gap-2 sm:gap-3"
      /*
       * Forced left-to-right. The surrounding page is RTL, which lays flex children
       * right-to-left and put the seconds first — the figures read as 22, 59, 17, 2
       * across the row. A counted-down clock is written largest-unit-first in every
       * locale, Hebrew included, so the row is LTR while its labels stay Hebrew.
       */
      dir="ltr"
      // A live region ticking every second would be announced endlessly. The figure
      // is decorative beside the date, which is already stated in full above.
      aria-hidden="true"
    >
      {UNITS.map((unit) => (
        <div
          key={unit.key}
          className="border-accent/40 from-secondary/40 flex min-w-14 flex-col items-center rounded-xl border bg-gradient-to-b to-white/60 px-2 py-2.5 sm:min-w-16 sm:px-3"
        >
          <span className="text-primary font-[family-name:var(--font-display)] text-2xl leading-none font-bold tabular-nums sm:text-3xl">
            {remaining[unit.key]}
          </span>
          <span className="text-muted-foreground mt-1 text-[11px] sm:text-xs">
            {unitLabel(remaining[unit.key], unit)}
          </span>
        </div>
      ))}
    </div>
  );
}
