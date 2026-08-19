'use client';

import { useEffect, useState } from 'react';

import { getAppCopy } from '@/config/appCopy';
import { defaultLocale, type Locale } from '@/lib/i18n';

interface CountdownProps {
  readonly targetMs: number;
  readonly locale?: Locale;
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

function unitLabel(value: number, forms: readonly [string, string, string]): string {
  if (value === 1) return forms[0];
  if (value === 2) return forms[1];
  return forms[2];
}

export function Countdown({ targetMs, locale = defaultLocale }: CountdownProps) {
  const copy = getAppCopy(locale).invitation;
  const units = [
    { key: 'days' as const, forms: copy.countdown.days },
    { key: 'hours' as const, forms: copy.countdown.hours },
    { key: 'minutes' as const, forms: copy.countdown.minutes },
    { key: 'seconds' as const, forms: copy.countdown.seconds },
  ];
  const [remaining, setRemaining] = useState<Remaining | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const tick = () => {
      setRemaining(remainingFrom(targetMs, Date.now()));
      setMounted(true);
    };
    const first = requestAnimationFrame(tick);
    const id = setInterval(tick, 1000);
    return () => {
      cancelAnimationFrame(first);
      clearInterval(id);
    };
  }, [targetMs]);

  if (!mounted) {
    return (
      <div className="flex items-stretch justify-center gap-2 sm:gap-3" dir="ltr" aria-hidden="true">
        {units.map((unit) => (
          <div
            key={unit.key}
            className="border-accent/40 from-secondary/40 flex min-w-14 flex-col items-center rounded-xl border bg-gradient-to-b to-white/60 px-2 py-2.5 sm:min-w-16 sm:px-3"
          >
            <span className="text-primary/25 font-[family-name:var(--font-display)] text-2xl leading-none font-bold tabular-nums sm:text-3xl">
              ––
            </span>
            <span className="text-muted-foreground mt-1 text-[11px] sm:text-xs">
              {unit.forms[2]}
            </span>
          </div>
        ))}
      </div>
    );
  }

  if (remaining === null) {
    return <p className="text-primary text-center text-lg font-semibold">{copy.celebrationToday}</p>;
  }

  return (
    <div
      className="flex items-stretch justify-center gap-2 sm:gap-3"
      dir="ltr"
      aria-hidden="true"
    >
      {units.map((unit) => (
        <div
          key={unit.key}
          className="border-accent/40 from-secondary/40 flex min-w-14 flex-col items-center rounded-xl border bg-gradient-to-b to-white/60 px-2 py-2.5 sm:min-w-16 sm:px-3"
        >
          <span className="text-primary font-[family-name:var(--font-display)] text-2xl leading-none font-bold tabular-nums sm:text-3xl">
            {remaining[unit.key]}
          </span>
          <span className="text-muted-foreground mt-1 text-[11px] sm:text-xs">
            {unitLabel(remaining[unit.key], unit.forms)}
          </span>
        </div>
      ))}
    </div>
  );
}
