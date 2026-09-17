import Link from 'next/link';
import type { ReactNode } from 'react';

import { Icon } from '@/components/ui/icons';
import { cn } from '@/lib/utils';

/**
 * The head of every console page.
 *
 * Eyebrow, title, lede and a slot for actions. Eight screens repeated this block with
 * eight slightly different spacings — `mt-2` here, `mt-3` there, a `max-w-2xl` on some
 * of the ledes and not on others — and the difference was visible when moving between
 * them. One component, one rhythm.
 *
 * `meta` is a row of small facts under the title (date · venue · countdown) which is
 * where a badge or two also belongs; `actions` is the page's primary call to action and
 * sits at the inline end on wide screens, below the title on a phone.
 */
export function PageHeader({
  eyebrow,
  title,
  lede,
  meta,
  actions,
  badges,
  className,
}: {
  eyebrow?: string;
  title: string;
  lede?: ReactNode;
  meta?: ReactNode;
  actions?: ReactNode;
  badges?: ReactNode;
  className?: string;
}) {
  return (
    <header
      className={cn(
        'flex flex-col gap-5 md:flex-row md:items-end md:justify-between md:gap-8',
        className,
      )}
    >
      <div className="min-w-0">
        {badges !== undefined && <div className="mb-3 flex flex-wrap items-center gap-2">{badges}</div>}
        {eyebrow !== undefined && (
          <p className="text-eyebrow text-accent-strong flex items-center gap-2.5 font-semibold">
            <span aria-hidden="true" className="bg-accent h-px w-5" />
            {eyebrow}
          </p>
        )}
        <h1 className="text-h1 text-primary mt-2 font-bold break-words">{title}</h1>
        {meta !== undefined && (
          <div className="text-muted-foreground mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm">
            {meta}
          </div>
        )}
        {lede !== undefined && (
          <p className="text-muted-foreground mt-3 max-w-2xl leading-relaxed">{lede}</p>
        )}
      </div>
      {actions !== undefined && (
        <div className="flex shrink-0 flex-wrap gap-2 md:justify-end">{actions}</div>
      )}
    </header>
  );
}

/**
 * The "back" link above a page header.
 *
 * The chevron points in the reading direction's "back" — rightwards in Hebrew — which
 * is the single most common right-to-left mistake, and the reason it is drawn once here
 * rather than at each call site.
 */
export function BackLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="text-muted-foreground hover:text-primary group inline-flex min-h-9 items-center gap-1 rounded-md text-sm font-medium transition-colors duration-[--duration-fast]"
    >
      <Icon
        name="chevron-back"
        strokeWidth={2}
        className="size-4 transition-transform duration-[--duration-fast] group-hover:translate-x-0.5"
      />
      {children}
    </Link>
  );
}

/** One fact in a `PageHeader` meta row: an icon and a short phrase. */
export function MetaItem({
  icon,
  children,
  className,
}: {
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span className={cn('inline-flex items-center gap-1.5', className)}>
      {icon !== undefined && <span className="text-accent-strong [&_svg]:size-4">{icon}</span>}
      {children}
    </span>
  );
}
