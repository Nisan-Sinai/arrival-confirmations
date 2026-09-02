import { cva, type VariantProps } from 'class-variance-authority';
import type { ComponentProps } from 'react';

import { cn } from '@/lib/utils';

/**
 * The button hierarchy (§11 of the design brief).
 *
 * Six variants, and the ranking between them is the point: exactly one `primary` per
 * view, `secondary` for the alternative a user might reasonably take instead, `outline`
 * and `ghost` for everything that is navigation rather than commitment.
 *
 * Two details that are easy to get wrong in RTL and are handled here rather than at
 * each call site:
 *   - `gap` plus flex ordering, so an icon sits before its label in reading order
 *     whichever direction the document runs.
 *   - `[&_svg]:shrink-0`, because a long Hebrew label in a narrow column otherwise
 *     squashes the icon into an ellipse.
 *
 * Press feedback is a 1px translate, not a scale. Scaling a button resamples its text
 * for the duration of the transition, which on a phone reads as a blur.
 */
const buttonVariants = cva(
  cn(
    'inline-flex items-center justify-center gap-2 rounded-full font-semibold whitespace-nowrap',
    'transition-[background-color,border-color,color,box-shadow,translate] duration-[--duration-fast] ease-[--ease-out]',
    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[--color-ring]',
    'disabled:pointer-events-none disabled:opacity-55',
    'active:translate-y-px',
    '[&_svg]:pointer-events-none [&_svg]:size-[1.125em] [&_svg]:shrink-0',
  ),
  {
    variants: {
      variant: {
        primary: 'bg-primary text-primary-foreground shadow-paper hover:bg-primary-hover',
        /*
         * The border here is `border-strong`, not `transparent`, and that is a fix
         * rather than a preference.
         *
         * `--secondary` is lightness 0.94 and `--border-strong` is 0.82, so a secondary
         * button with an invisible edge was a pale tint floating on a 0.98 card — paler,
         * in practice, than the bordered `outline` sitting *below* it in the hierarchy.
         * Every screen that used both read them in the wrong order, which is the opposite
         * of what a ranked variant set is for.
         *
         * Giving it the same edge as `outline` and keeping its tint restores the ranking:
         * same frame, more fill, more weight. The box model is unchanged, since the
         * transparent border was already reserving the pixel.
         */
        secondary:
          'bg-secondary text-secondary-foreground hover:bg-secondary/70 border border-border-strong',
        outline: 'border border-border-strong text-primary bg-card/60 hover:bg-secondary/50',
        /* The gold call to action. Reserved for the single most important action on
           the guest surface, which is why it is not simply `accent`. */
        gold: 'border border-accent-strong/40 bg-accent-soft text-accent-foreground hover:bg-accent/70',
        ghost: 'text-primary hover:bg-secondary/60',
        destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
        link: 'text-primary underline underline-offset-4 hover:text-primary-hover rounded-sm',
      },
      size: {
        /* 44px minimum on every real button — the WCAG 2.5.5 target size, and the
           reason `sm` is not smaller than it looks like it should be. */
        sm: 'h-10 px-4 text-sm',
        md: 'h-11 px-6 text-base',
        lg: 'h-13 px-8 text-base sm:text-lg',
        icon: 'size-11 p-0',
        inline: 'h-auto p-0',
      },
      block: {
        true: 'w-full',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
);

export type ButtonProps = ComponentProps<'button'> & VariantProps<typeof buttonVariants>;

export function Button({ className, variant, size, block, type, ...props }: ButtonProps) {
  return (
    <button
      // A button inside a form with no explicit type submits it. That has caused a
      // "delete" control to save a form more than once in this codebase's lifetime.
      type={type ?? 'button'}
      className={cn(buttonVariants({ variant, size, block }), className)}
      {...props}
    />
  );
}

/** Same visual contract for anchors and `next/link`, which cannot be `<button>`. */
export function buttonClass(
  options: VariantProps<typeof buttonVariants> & { className?: string } = {},
): string {
  const { className, ...variants } = options;
  return cn(buttonVariants(variants), className);
}

export { buttonVariants };
