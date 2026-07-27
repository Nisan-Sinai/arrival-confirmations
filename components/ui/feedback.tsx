import { cva, type VariantProps } from 'class-variance-authority';
import type { ComponentProps, ReactNode } from 'react';

import { cn } from '@/lib/utils';

/**
 * Status, empty, loading and error presentation (§17 of the design brief).
 *
 * These exist so no screen in the product answers a question with a blank rectangle.
 * Every one of them states what happened and, where there is one, offers the next
 * action rather than leaving the user to guess it.
 */

const badgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap',
  {
    variants: {
      tone: {
        neutral: 'bg-secondary text-secondary-foreground',
        success: 'bg-success-soft text-success',
        danger: 'bg-destructive-soft text-destructive',
        warning: 'bg-warning-soft text-accent-foreground',
        gold: 'bg-accent-soft text-accent-foreground',
        outline: 'border border-border-strong text-muted-foreground',
      },
    },
    defaultVariants: { tone: 'neutral' },
  },
);

export type BadgeProps = ComponentProps<'span'> & VariantProps<typeof badgeVariants>;

export function Badge({ className, tone, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />;
}

const alertVariants = cva('flex gap-3 rounded-xl border p-4 text-sm', {
  variants: {
    tone: {
      info: 'border-border bg-secondary/40 text-secondary-foreground',
      success: 'border-success/25 bg-success-soft text-success',
      error: 'border-destructive/25 bg-destructive-soft text-destructive',
      warning: 'border-accent-strong/25 bg-warning-soft text-accent-foreground',
    },
  },
  defaultVariants: { tone: 'info' },
});

/**
 * An inline message about something that just happened.
 *
 * `role` defaults to `status` and is raised to `alert` for the error tone, which is
 * the distinction that matters to a screen reader: `alert` interrupts, `status` waits
 * for a pause. Getting this backwards means either a silent failure or a confirmation
 * that talks over the user.
 */
export function Alert({
  tone = 'info',
  title,
  children,
  className,
  role,
}: {
  tone?: 'info' | 'success' | 'error' | 'warning';
  title?: string;
  children?: ReactNode;
  className?: string;
  role?: 'status' | 'alert';
}) {
  return (
    <div
      role={role ?? (tone === 'error' ? 'alert' : 'status')}
      className={cn(alertVariants({ tone }), className)}
    >
      <div className="min-w-0 flex-1">
        {title !== undefined && <p className="font-semibold">{title}</p>}
        {children !== undefined && (
          <div className={cn('leading-relaxed', title !== undefined && 'mt-1 opacity-90')}>
            {children}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * The state a list is in before it has anything in it.
 *
 * Deliberately not an illustration: a drawn empty box would be one more asset to load
 * and would say less than the sentence beneath it. The gold ring and the icon are
 * enough to mark the block as intentional rather than broken.
 */
export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: ReactNode;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'border-border bg-card/60 flex flex-col items-center rounded-2xl border border-dashed px-6 py-14 text-center',
        className,
      )}
    >
      {icon !== undefined && (
        <span
          aria-hidden="true"
          className="border-accent-strong/30 text-accent-strong mb-5 flex size-14 items-center justify-center rounded-full border"
        >
          {icon}
        </span>
      )}
      <p className="text-primary text-h3 font-semibold">{title}</p>
      {description !== undefined && (
        <div className="text-muted-foreground mt-2.5 max-w-md leading-relaxed">{description}</div>
      )}
      {action !== undefined && <div className="mt-7">{action}</div>}
    </div>
  );
}

/**
 * A skeleton block.
 *
 * `aria-hidden` with the loading state announced once by the container: a skeleton
 * grid that each announced itself would read as "loading" fifteen times.
 */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn('bg-muted animate-pulse rounded-lg', className)}
      style={{ animationDuration: '1.6s' }}
    />
  );
}

export function LoadingState({ label = 'טוען…' }: { label?: string }) {
  return (
    <div role="status" aria-live="polite" className="flex flex-col gap-4 py-10">
      <span className="sr-only">{label}</span>
      <Skeleton className="h-8 w-52" />
      <Skeleton className="h-4 w-full max-w-md" />
      <Skeleton className="h-4 w-full max-w-sm" />
    </div>
  );
}
