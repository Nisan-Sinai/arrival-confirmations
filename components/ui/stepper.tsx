'use client';

import { useRef, type ComponentProps } from 'react';

import { Icon } from '@/components/ui/icons';
import { Input } from '@/components/ui/field';
import { cn } from '@/lib/utils';

/**
 * A number input with a minus and a plus on either side.
 *
 * Built for one screen: the head count on the RSVP form, filled in on a phone by a guest
 * who may be seventy. A bare `<input type="number">` there means finding the tiny
 * spinner or summoning a keyboard for a one-digit answer; two 44px buttons need neither.
 *
 * The input stays a real `<input type="number">` with the same `name`, so the Server
 * Action, the validation and the tests see exactly what they saw before, and the form
 * still works before hydration — the buttons are an enhancement on top of a field that
 * already works without them. It stays uncontrolled for the same reason every form in
 * this product is: React resets it after the action, and `defaultValue` is what the
 * echoed submission repaints.
 */
export function NumberStepper({
  min = 0,
  max = 99,
  className,
  decrementLabel = 'הפחתה',
  incrementLabel = 'הוספה',
  ...props
}: ComponentProps<'input'> & { decrementLabel?: string; incrementLabel?: string }) {
  const ref = useRef<HTMLInputElement>(null);
  const lower = Number(min);
  const upper = Number(max);

  const step = (delta: number) => {
    const input = ref.current;
    if (input === null) return;
    const current = Number.parseInt(input.value, 10);
    const base = Number.isNaN(current) ? lower : current;
    const next = Math.min(upper, Math.max(lower, base + delta));
    // Setting `.value` on an uncontrolled input is exactly what typing does, and it keeps
    // the native `input` event flowing for anything listening.
    input.value = String(next);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  };

  return (
    <div
      className={cn(
        'border-input bg-card hover:border-border-strong focus-within:border-primary flex items-stretch overflow-hidden rounded-xl border transition-colors duration-[--duration-fast]',
        className,
      )}
    >
      <button
        type="button"
        onClick={() => step(-1)}
        aria-label={decrementLabel}
        tabIndex={-1}
        className="text-primary hover:bg-secondary/70 active:bg-secondary flex w-11 shrink-0 items-center justify-center transition-colors duration-[--duration-fast]"
      >
        <Icon name="minus" strokeWidth={2} className="size-4" />
      </button>
      <Input
        ref={ref}
        type="number"
        min={min}
        max={max}
        inputMode="numeric"
        className="min-w-0 flex-1 rounded-none border-0 border-x px-1 text-center font-semibold tabular-nums hover:border-inherit focus-visible:outline-0 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        {...props}
      />
      <button
        type="button"
        onClick={() => step(1)}
        aria-label={incrementLabel}
        tabIndex={-1}
        className="text-primary hover:bg-secondary/70 active:bg-secondary flex w-11 shrink-0 items-center justify-center transition-colors duration-[--duration-fast]"
      >
        <Icon name="plus" strokeWidth={2} className="size-4" />
      </button>
    </div>
  );
}
