'use client';

import { useActionState, useId, useState } from 'react';

import { updateExpectedGuestsAction, type ExpectedGuestsState } from '@/app/actions/manageEvent';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { UI_MESSAGES } from '@/config/messages';

/**
 * The response-rate tile, with its own denominator editable in place (§8.1).
 *
 * The number is "how many invitations did you send", and the host knows it while they
 * are looking at the replies — not while they are on a separate edit form three clicks
 * away. Sending them there to change one integer is the kind of friction that leaves a
 * tile reading "not available" forever, which is exactly what this one did.
 *
 * It stays a plain form posting to a Server Action, so it works before hydration like
 * every other form in this product. `useActionState` only adds the inline confirmation.
 */

const INITIAL: ExpectedGuestsState = { status: 'idle', message: '' };

interface ResponseRateTileProps {
  readonly eventId: string;
  /** Null when the host has not said, which is when no percentage may be shown. */
  readonly percentage: number | null;
  readonly invited: number;
  readonly expectedGuests: number | null;
}

export function ResponseRateTile({
  eventId,
  percentage,
  invited,
  expectedGuests,
}: ResponseRateTileProps) {
  const [state, formAction, isPending] = useActionState(updateExpectedGuestsAction, INITIAL);
  const [editing, setEditing] = useState(false);
  const fieldId = useId();

  /**
   * Closes the editor once the action reports a save. Written as a render-time
   * reconciliation rather than an effect: an effect would paint the form one more time
   * after the new value has already arrived from the server.
   */
  const [seen, setSeen] = useState<ExpectedGuestsState>(INITIAL);
  if (state !== seen) {
    setSeen(state);
    if (state.status === 'saved') setEditing(false);
  }

  if (editing) {
    return (
      <Card padding="none" className="p-4 sm:p-5">
        <form action={formAction} className="flex flex-col gap-2">
          <input type="hidden" name="eventId" value={eventId} />
          <label htmlFor={fieldId} className="text-muted-foreground text-xs sm:text-sm">
            כמה הזמנות שלחתם?
          </label>
          <input
            id={fieldId}
            name="expectedGuests"
            type="number"
            min={1}
            max={5000}
            inputMode="numeric"
            autoFocus
            defaultValue={expectedGuests ?? ''}
            placeholder="למשל 120"
            aria-invalid={state.status === 'error' || undefined}
            aria-describedby={state.status === 'error' ? `${fieldId}-error` : undefined}
            // 16px minimum: iOS zooms the viewport on a smaller focused input and
            // never zooms back out.
            className="border-input bg-card focus-visible:border-primary w-full rounded-lg border px-3 py-2 text-base focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[--color-ring]"
          />
          {state.status === 'error' && (
            <p id={`${fieldId}-error`} role="alert" className="text-destructive text-xs">
              {state.message}
            </p>
          )}
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={isPending}>
              {isPending ? 'שומר…' : 'שמירה'}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>
              ביטול
            </Button>
          </div>
          <p className="text-muted-foreground text-xs leading-relaxed">
            משמש רק לחישוב האחוז. השאירו ריק אם אינכם יודעים.
          </p>
        </form>
      </Card>
    );
  }

  return (
    <Card padding="none" className="flex flex-col justify-between p-4 sm:p-5">
      <p className="text-muted-foreground text-xs sm:text-sm">אחוז מענה</p>
      <p className="text-primary mt-2 font-[family-name:var(--font-display)] text-2xl leading-none font-bold tabular-nums">
        {/* §8.1: with no denominator there is no percentage, and none is invented. */}
        {percentage === null ? UI_MESSAGES.admin.responseRateUnavailable : `${percentage}%`}
      </p>
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="text-accent-strong mt-1.5 self-start rounded-sm text-xs underline underline-offset-2 hover:no-underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[--color-ring]"
      >
        {percentage === null ? 'הזינו כמה הזמנות שלחתם' : `מתוך ${invited} הזמנות · שינוי`}
      </button>
      {/* Announced once, after the form has closed and the button is back. */}
      <p role="status" aria-live="polite" className="sr-only">
        {state.status === 'saved' ? state.message : ''}
      </p>
    </Card>
  );
}
