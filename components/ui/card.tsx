import { cva, type VariantProps } from 'class-variance-authority';
import type { ComponentProps, ReactNode } from 'react';

import { cn } from '@/lib/utils';

/**
 * Cards (§10 of the design brief).
 *
 * Restrained on purpose: a hairline border and a contact shadow, not a floating slab.
 * The `interactive` variant is the only one that lifts, and it lifts by 2px — enough
 * to register as a response to the pointer, not enough to look like it detached.
 */
const cardVariants = cva(
  'rounded-2xl transition-all duration-[--duration-base] ease-[--ease-out]',
  {
    variants: {
      variant: {
        /* Default. Raised paper on paper. */
        paper: 'bg-card border border-border shadow-paper',
        /* Flat, for cards inside an already-elevated container. */
        quiet: 'bg-card/70 border border-border',
        /* A statement block — the one that carries a pull quote or a headline fact. */
        accent: 'bg-accent-soft/40 border border-accent-strong/25',
        ink: 'bg-surface-ink text-primary-foreground border border-white/10',
        /* No chrome at all; for grouping without drawing a box. */
        bare: '',
      },
      interactive: {
        true: 'hover:shadow-raised hover:-translate-y-0.5 focus-within:shadow-raised focus-within:-translate-y-0.5',
      },
      padding: {
        none: '',
        sm: 'p-4 sm:p-5',
        md: 'p-6 sm:p-7',
        lg: 'p-7 sm:p-9',
      },
    },
    defaultVariants: { variant: 'paper', padding: 'md' },
  },
);

export type CardProps = ComponentProps<'div'> & VariantProps<typeof cardVariants>;

export function Card({ className, variant, interactive, padding, ...props }: CardProps) {
  return (
    <div className={cn(cardVariants({ variant, interactive, padding }), className)} {...props} />
  );
}

export function CardTitle({
  as: Tag = 'h3',
  className,
  children,
}: {
  as?: 'h2' | 'h3' | 'h4';
  className?: string;
  children: ReactNode;
}) {
  return <Tag className={cn('text-h3 text-primary font-semibold', className)}>{children}</Tag>;
}

export function CardBody({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <p className={cn('text-muted-foreground mt-2.5 leading-relaxed', className)}>{children}</p>
  );
}

export { cardVariants };
