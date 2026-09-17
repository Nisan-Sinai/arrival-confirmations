import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

/**
 * A statistic tile (§8).
 *
 * The same tile used to be written three times — `Stat` on the event page, `SummaryCard`
 * on the guest page, four bare `Card`s on the admin page — each with its own type size
 * and its own idea of where the hint goes. `emphasis` is the whole difference between a
 * dashboard you can scan and one you have to read: the head count the caterer needs is
 * not a peer of "how many babies", and a row of identical tiles said it was.
 *
 * `progress` draws a thin bar under the figure. It is the one piece of chrome that turns
 * "62%" from a number into a picture of how far along the replies are.
 */
export function StatCard({
  label,
  value,
  hint,
  emphasis = false,
  icon,
  progress,
  tone = 'default',
  footer,
  className,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  emphasis?: boolean;
  icon?: ReactNode;
  /** 0–100. Rendered as a hairline bar beneath the figure. */
  progress?: number | null;
  tone?: 'default' | 'success' | 'danger' | 'warning';
  footer?: ReactNode;
  className?: string;
}) {
  const valueTone = {
    default: 'text-primary',
    success: 'text-success',
    danger: 'text-destructive',
    warning: 'text-accent-strong',
  }[tone];

  return (
    <div
      className={cn(
        'relative flex min-w-0 flex-col justify-between overflow-hidden rounded-2xl border p-4 transition-shadow duration-[--duration-base] sm:p-5',
        emphasis
          ? 'border-accent-strong/25 from-accent-soft/55 to-card bg-gradient-to-b shadow-paper'
          : 'border-border bg-card shadow-paper',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-muted-foreground text-xs font-medium sm:text-sm">{label}</p>
        {icon !== undefined && (
          <span
            aria-hidden="true"
            className={cn(
              'flex size-8 shrink-0 items-center justify-center rounded-full [&_svg]:size-4',
              emphasis ? 'bg-accent-soft text-accent-strong' : 'bg-secondary/70 text-primary',
            )}
          >
            {icon}
          </span>
        )}
      </div>
      <p
        className={cn(
          'mt-2 font-[family-name:var(--font-display)] leading-none font-bold tabular-nums',
          emphasis ? 'text-4xl sm:text-5xl' : 'text-2xl sm:text-3xl',
          valueTone,
        )}
      >
        {value}
      </p>
      {progress !== undefined && progress !== null && (
        <div
          aria-hidden="true"
          className="bg-border/80 mt-3 h-1.5 w-full overflow-hidden rounded-full"
        >
          <div
            className="bg-accent-strong h-full rounded-full transition-[width] duration-[--duration-slow] ease-[--ease-out]"
            style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
          />
        </div>
      )}
      {hint !== undefined && <p className="text-muted-foreground mt-1.5 text-xs">{hint}</p>}
      {footer !== undefined && <div className="mt-2">{footer}</div>}
    </div>
  );
}
