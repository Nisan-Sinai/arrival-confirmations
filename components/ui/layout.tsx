import type { ComponentProps, ElementType, ReactNode } from 'react';

import { cn } from '@/lib/utils';

/**
 * Layout primitives (§23 of the design brief).
 *
 * Three components carry every page's rhythm, which is what stops "a bit more padding
 * here" accumulating into eleven different section spacings. `Container` owns width,
 * `Section` owns vertical rhythm and band colour, `SectionHeader` owns the eyebrow →
 * heading → lede pattern that repeats down the landing page.
 */

const WIDTHS = {
  prose: 'max-w-[--container-prose]',
  card: 'max-w-[--container-card]',
  app: 'max-w-[--container-app]',
  wide: 'max-w-[--container-wide]',
} as const;

export function Container({
  as: Tag = 'div',
  width = 'app',
  className,
  children,
}: {
  as?: ElementType;
  width?: keyof typeof WIDTHS;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Tag className={cn('mx-auto w-full px-5 sm:px-8', WIDTHS[width], className)}>{children}</Tag>
  );
}

const TONES = {
  paper: '',
  sand: 'bg-surface-sand',
  /* The one dark band on the site. Used once per page at most — its job is to break
     a long cream page, and a second one would make it a stripe pattern. */
  ink: 'bg-surface-ink text-primary-foreground',
  card: 'bg-card',
} as const;

const SPACING = {
  sm: 'py-12 sm:py-16',
  md: 'py-16 sm:py-24',
  lg: 'py-20 sm:py-32',
} as const;

export function Section({
  as: Tag = 'section',
  tone = 'paper',
  spacing = 'md',
  className,
  children,
  ...rest
}: {
  as?: ElementType;
  tone?: keyof typeof TONES;
  spacing?: keyof typeof SPACING;
  className?: string;
  children: ReactNode;
} & Omit<ComponentProps<'section'>, 'className' | 'children'>) {
  return (
    <Tag className={cn('relative', TONES[tone], SPACING[spacing], className)} {...rest}>
      {children}
    </Tag>
  );
}

export function SectionHeader({
  eyebrow,
  title,
  lede,
  id,
  align = 'center',
  className,
}: {
  eyebrow?: string;
  title: string;
  lede?: string;
  id?: string;
  align?: 'start' | 'center';
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex flex-col gap-4',
        align === 'center' ? 'items-center text-center' : 'items-start text-start',
        className,
      )}
    >
      {eyebrow !== undefined && (
        <p className="text-eyebrow text-accent-strong flex items-center gap-2.5 font-semibold">
          <span aria-hidden="true" className="bg-accent h-px w-6" />
          {eyebrow}
        </p>
      )}
      <h2 id={id} className="text-h2 text-primary font-bold">
        {title}
      </h2>
      {lede !== undefined && (
        <p
          className={cn(
            'text-lead text-muted-foreground max-w-2xl',
            align === 'center' && 'mx-auto',
          )}
        >
          {lede}
        </p>
      )}
    </div>
  );
}

/**
 * The gold hairline used as a separator throughout the guest surface.
 *
 * Decorative, so it is hidden from assistive technology — a screen reader announcing
 * "separator" between every block of an invitation is noise, and the headings already
 * carry the structure.
 */
export function Rule({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center justify-center gap-2.5', className)} aria-hidden="true">
      <span className="from-accent/0 to-accent h-px w-16 bg-gradient-to-l sm:w-24" />
      <svg viewBox="0 0 24 24" className="fill-accent size-2.5" role="presentation">
        <path d="M12 2l2.5 7.5L22 12l-7.5 2.5L12 22l-2.5-7.5L2 12l7.5-2.5z" />
      </svg>
      <span className="from-accent/0 to-accent h-px w-16 bg-gradient-to-r sm:w-24" />
    </div>
  );
}
