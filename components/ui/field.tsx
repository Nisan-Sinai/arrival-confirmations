'use client';

import { createContext, useContext, useId, type ComponentProps, type ReactNode } from 'react';

import { cn } from '@/lib/utils';

/**
 * Form fields (§12 and §20 of the design brief).
 *
 * The accessibility wiring lives here rather than at each call site, because the
 * failure it prevents is one of omission: before this component, the admin form
 * rendered its errors as loose paragraphs with no `aria-describedby` and no
 * `aria-invalid`, so a screen-reader user reached a rejected field and was told
 * nothing at all. A control that opts into `<Field>` cannot make that mistake — the
 * ids are generated here and handed down through context.
 *
 * The rule the design brief states and this enforces: labels are always visible.
 * A placeholder is a hint, never a name.
 */

interface FieldContextValue {
  readonly controlId: string | undefined;
  readonly describedBy: string | undefined;
  readonly invalid: boolean;
  readonly required: boolean;
}

const FieldContext = createContext<FieldContextValue | null>(null);

/**
 * Outside a `<Field>` the control still renders — it just carries no Field-derived id or
 * `aria-describedby`, and labels itself through its own `aria-label`.
 *
 * This used to throw. The rule it enforced — a labelled control in every *form* — is real,
 * and inside a form a `<Field>` still supplies it. But the Pro seating studio uses these
 * same styled controls in dense table cells, where a visible per-cell label would be
 * absurd and each control names itself with `aria-label` instead. A hard throw turned that
 * legitimate use into a white screen for the whole page — a far worse accessibility outcome
 * than the missing id it was guarding against — so the guard gives way to a safe default.
 */
const STANDALONE: FieldContextValue = {
  controlId: undefined,
  describedBy: undefined,
  invalid: false,
  required: false,
};

function useField(): FieldContextValue {
  return useContext(FieldContext) ?? STANDALONE;
}

export function Field({
  label,
  error,
  hint,
  required = false,
  requiredLabel = 'שדה חובה',
  className,
  children,
}: {
  label: string;
  error?: string | undefined;
  hint?: string | undefined;
  required?: boolean;
  requiredLabel?: string;
  className?: string;
  children: ReactNode;
}) {
  const uid = useId();
  const controlId = `${uid}-control`;
  const errorId = `${uid}-error`;
  const hintId = `${uid}-hint`;

  // Order matters: a screen reader reads the description in the order given, and the
  // error is the more urgent of the two.
  const describedBy =
    [error !== undefined ? errorId : null, hint !== undefined ? hintId : null]
      .filter((id): id is string => id !== null)
      .join(' ') || undefined;

  return (
    <FieldContext.Provider
      value={{ controlId, describedBy, invalid: error !== undefined, required }}
    >
      <div className={cn('flex flex-col', className)}>
        <label htmlFor={controlId} className="text-primary text-sm font-semibold">
          {label}
          {required && (
            <>
              {/* The asterisk is visual; the word is what gets announced. Rendering
                  only the glyph leaves "star" or nothing at all in a screen reader. */}
              <span aria-hidden="true" className="text-accent-strong ms-1">
                *
              </span>{' '}
              <span className="sr-only"> ({requiredLabel})</span>
            </>
          )}
        </label>
        {hint !== undefined && (
          <p id={hintId} className="text-muted-foreground mt-1 text-sm">
            {hint}
          </p>
        )}
        <div className="mt-1.5">{children}</div>
        {error !== undefined && (
          // role="alert" announces the message when it appears, without stealing focus.
          <p id={errorId} role="alert" className="text-destructive mt-1.5 text-sm font-medium">
            {error}
          </p>
        )}
      </div>
    </FieldContext.Provider>
  );
}

/**
 * Shared control surface.
 *
 * `text-base` is not a stylistic choice: iOS Safari zooms the viewport when a focused
 * input's text is below 16px, and the page never zooms back out.
 */
const controlClass = cn(
  'w-full rounded-xl border bg-card px-3.5 py-2.5 text-base text-foreground',
  'placeholder:text-muted-foreground/70',
  'transition-[border-color,box-shadow] duration-[--duration-fast] ease-[--ease-out]',
  'hover:border-border-strong',
  'focus-visible:border-primary focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[--color-ring]',
  'disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground',
  'aria-[invalid=true]:border-destructive aria-[invalid=true]:bg-destructive-soft/40',
);

export function Input({ className, ...props }: ComponentProps<'input'>) {
  const { controlId, describedBy, invalid, required } = useField();
  return (
    <input
      id={controlId}
      aria-describedby={describedBy}
      aria-invalid={invalid || undefined}
      required={required || undefined}
      className={cn(controlClass, 'border-input', className)}
      {...props}
    />
  );
}

export function Textarea({ className, ...props }: ComponentProps<'textarea'>) {
  const { controlId, describedBy, invalid, required } = useField();
  return (
    <textarea
      id={controlId}
      aria-describedby={describedBy}
      aria-invalid={invalid || undefined}
      required={required || undefined}
      className={cn(controlClass, 'border-input min-h-24 resize-y', className)}
      {...props}
    />
  );
}

/**
 * A styled `<select>`.
 *
 * Still a native select, deliberately: a custom listbox would have to reimplement
 * type-ahead, the mobile wheel picker and every keyboard convention, and would be
 * worse at all three. `appearance-none` plus a drawn chevron is the whole change, and
 * the chevron sits on the inline-end so it follows the text direction.
 */
export function Select({ className, children, ...props }: ComponentProps<'select'>) {
  const { controlId, describedBy, invalid, required } = useField();
  return (
    <div className="relative">
      <select
        id={controlId}
        aria-describedby={describedBy}
        aria-invalid={invalid || undefined}
        required={required || undefined}
        className={cn(controlClass, 'border-input appearance-none pe-10', className)}
        {...props}
      >
        {children}
      </select>
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-muted-foreground pointer-events-none absolute inset-y-0 end-3.5 my-auto size-4"
      >
        <path d="m6 9 6 6 6-6" />
      </svg>
    </div>
  );
}

/**
 * A checkbox with its explanatory text, as one target.
 *
 * Not built on `<Field>`: the label wraps the control here rather than pointing at it,
 * which is what makes the whole paragraph tappable — and a consent tick with a
 * three-line explanation needs to be tappable across all three lines.
 */
export function CheckboxField({
  name,
  error,
  required = false,
  defaultChecked,
  children,
}: {
  name: string;
  error?: string | undefined;
  required?: boolean;
  defaultChecked?: boolean;
  children: ReactNode;
}) {
  const uid = useId();
  const errorId = `${uid}-error`;

  return (
    <div>
      <label className="group border-border bg-card/60 hover:border-border-strong flex cursor-pointer items-start gap-3 rounded-xl border p-3.5 transition-colors duration-[--duration-fast]">
        <input
          type="checkbox"
          name={name}
          required={required || undefined}
          defaultChecked={defaultChecked}
          aria-describedby={error !== undefined ? errorId : undefined}
          aria-invalid={error !== undefined || undefined}
          className="accent-primary mt-0.5 size-5 shrink-0 cursor-pointer"
        />
        <span className="text-muted-foreground text-sm leading-relaxed">{children}</span>
      </label>
      {error !== undefined && (
        <p id={errorId} role="alert" className="text-destructive mt-1.5 text-sm font-medium">
          {error}
        </p>
      )}
    </div>
  );
}

/**
 * One option in a radio group, drawn as a full-width card.
 *
 * `has-checked:` styles the container from the input's own state, so the selected
 * option is visible without mirroring `checked` into React state purely for looks.
 */
export function RadioCard({
  name,
  value,
  label,
  defaultChecked,
  onChange,
}: {
  name: string;
  value: string;
  label: string;
  defaultChecked?: boolean;
  onChange?: (value: string) => void;
}) {
  return (
    <label
      className={cn(
        'border-input bg-card flex cursor-pointer items-center gap-3 rounded-xl border px-3.5 py-3',
        'transition-[background-color,border-color] duration-[--duration-fast] ease-[--ease-out]',
        'hover:border-border-strong',
        'has-checked:border-primary has-checked:bg-secondary/55 has-checked:shadow-paper',
        'has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-[--color-ring]',
      )}
    >
      <input
        type="radio"
        name={name}
        value={value}
        defaultChecked={defaultChecked}
        onChange={(event) => onChange?.(event.target.value)}
        className="accent-primary size-5 shrink-0 cursor-pointer"
      />
      <span className="text-base font-medium">{label}</span>
    </label>
  );
}
