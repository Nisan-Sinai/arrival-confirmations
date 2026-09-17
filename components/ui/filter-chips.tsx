'use client';

import { cn } from '@/lib/utils';

/**
 * A row of mutually exclusive filter chips.
 *
 * Buttons with `aria-pressed`, not tabs: a tab panel replaces its content, a filter
 * narrows the same list, and a screen reader user should hear "pressed" rather than
 * "selected, 1 of 4" for something that behaves like a toggle. Each chip carries its
 * count so the row also reads as a summary before anyone taps it.
 *
 * Scrolls horizontally on a phone rather than wrapping: four chips on two lines look
 * like two separate controls.
 */
export function FilterChips<T extends string>({
  label,
  options,
  value,
  onChange,
  className,
}: {
  label: string;
  options: readonly { value: T; label: string; count?: number; tone?: 'success' | 'danger' | 'warning' }[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className={cn('-mx-1 flex gap-1.5 overflow-x-auto px-1 py-1 [scrollbar-width:none]', className)}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(option.value)}
            className={cn(
              'inline-flex h-9 shrink-0 items-center gap-2 rounded-full border px-3.5 text-sm font-semibold whitespace-nowrap',
              'transition-[background-color,border-color,color] duration-[--duration-fast] ease-[--ease-out]',
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[--color-ring]',
              active
                ? 'border-primary bg-primary text-primary-foreground shadow-paper'
                : 'border-border-strong bg-card text-primary hover:bg-secondary/60',
            )}
          >
            {option.tone !== undefined && (
              <span
                aria-hidden="true"
                className={cn(
                  'size-2 rounded-full',
                  option.tone === 'success' && 'bg-success',
                  option.tone === 'danger' && 'bg-destructive',
                  option.tone === 'warning' && 'bg-accent-strong',
                  active && 'bg-primary-foreground/80',
                )}
              />
            )}
            {option.label}
            {option.count !== undefined && (
              <span
                className={cn(
                  'rounded-full px-1.5 text-xs tabular-nums',
                  active ? 'bg-primary-foreground/15' : 'bg-secondary text-secondary-foreground',
                )}
              >
                {option.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
