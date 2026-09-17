import { TZDate } from '@date-fns/tz';

import { EVENT_TIMEZONE } from '@/config/event.config';
import { cn } from '@/lib/utils';

/**
 * The date as a small calendar leaf: the day number large, the month and weekday under
 * it. A host scanning a list of events finds "the one on the 14th" faster from a figure
 * than from `14.9.2026` set in running text, and the tile gives every card the same
 * anchor at its start edge.
 *
 * Rendered in Asia/Jerusalem, like every other date in the product.
 */
export function DateTile({
  isoDate,
  className,
  size = 'md',
}: {
  isoDate: string;
  className?: string;
  size?: 'md' | 'lg';
}) {
  const zoned = new TZDate(`${isoDate}T00:00:00`, EVENT_TIMEZONE);
  const day = new Intl.DateTimeFormat('he-IL', { day: 'numeric', timeZone: EVENT_TIMEZONE }).format(
    zoned,
  );
  const month = new Intl.DateTimeFormat('he-IL', {
    month: 'long',
    timeZone: EVENT_TIMEZONE,
  }).format(zoned);
  const weekday = new Intl.DateTimeFormat('he-IL', {
    weekday: 'short',
    timeZone: EVENT_TIMEZONE,
  }).format(zoned);

  return (
    <div
      aria-hidden="true"
      className={cn(
        'border-accent-strong/30 bg-card text-primary shadow-paper flex shrink-0 flex-col items-center justify-center overflow-hidden rounded-xl border text-center',
        size === 'lg' ? 'size-20' : 'size-16',
        className,
      )}
    >
      <span className="bg-accent-soft/70 text-accent-foreground w-full py-0.5 text-[10px] font-semibold tracking-wide">
        {weekday}
      </span>
      <span
        className={cn(
          'font-[family-name:var(--font-display)] leading-none font-bold tabular-nums',
          size === 'lg' ? 'mt-1 text-3xl' : 'mt-0.5 text-2xl',
        )}
      >
        {day}
      </span>
      <span className="text-muted-foreground mt-0.5 mb-1 text-[11px] leading-none">{month}</span>
    </div>
  );
}
