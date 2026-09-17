'use client';

import { useId, type ComponentProps } from 'react';

import { Icon } from '@/components/ui/icons';
import { cn } from '@/lib/utils';

/**
 * A search box: a magnifier at the inline start, a clear button once there is text.
 *
 * Works in both directions. Controlled (`value` + `onChange`) for the client-side
 * filters on the guest and reply lists; uncontrolled (`defaultValue` + `name`) inside a
 * plain `<form role="search">` for the admin pages that filter on the server. The clear
 * button only renders in the controlled case, where it has something to clear.
 *
 * `label` is always required and always rendered — visually hidden by default, because
 * a magnifier and a placeholder already say "search" to a sighted user — so the field is
 * never nameless to a screen reader.
 */
export function SearchInput({
  label,
  value,
  onValueChange,
  className,
  inputClassName,
  showLabel = false,
  ...props
}: Omit<ComponentProps<'input'>, 'value' | 'onChange' | 'type'> & {
  label: string;
  value?: string;
  onValueChange?: (value: string) => void;
  inputClassName?: string;
  showLabel?: boolean;
}) {
  const id = useId();
  const controlled = value !== undefined;

  return (
    <div className={cn('min-w-0', className)}>
      <label
        htmlFor={id}
        className={showLabel ? 'text-primary mb-1.5 block text-sm font-semibold' : 'sr-only'}
      >
        {label}
      </label>
      <div className="relative">
        <Icon
          name="search"
          className="text-muted-foreground pointer-events-none absolute inset-y-0 start-3.5 my-auto size-4.5"
        />
        <input
          id={id}
          type="search"
          value={controlled ? value : undefined}
          onChange={controlled ? (event) => onValueChange?.(event.target.value) : undefined}
          className={cn(
            'bg-card text-foreground border-input placeholder:text-muted-foreground/70 min-h-11 w-full rounded-full border ps-11 pe-11 text-base',
            'transition-[border-color,box-shadow] duration-[--duration-fast] ease-[--ease-out]',
            'hover:border-border-strong focus-visible:border-primary focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[--color-ring]',
            '[&::-webkit-search-cancel-button]:hidden',
            inputClassName,
          )}
          {...props}
        />
        {controlled && value !== '' && (
          <button
            type="button"
            onClick={() => onValueChange?.('')}
            aria-label="ניקוי החיפוש"
            className="text-muted-foreground hover:bg-secondary hover:text-primary absolute inset-y-0 end-2 my-auto flex size-8 items-center justify-center rounded-full transition-colors duration-[--duration-fast]"
          >
            <Icon name="x" className="size-4" />
          </button>
        )}
      </div>
    </div>
  );
}
