'use client';

import { useActionState, useId, useState } from 'react';

import { updateExpectedGuestsAction, type ExpectedGuestsState } from '@/app/actions/manageEvent';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useAppLocale } from '@/features/i18n/AppLocaleProvider';

const INITIAL: ExpectedGuestsState = { status: 'idle', message: '' };

const COPY = {
  he: {
    question: 'כמה הזמנות שלחתם?',
    placeholder: 'למשל 120',
    saving: 'שומר…',
    save: 'שמירה',
    cancel: 'ביטול',
    hint: 'משמש רק לחישוב האחוז. השאירו ריק אם אינכם יודעים.',
    title: 'אחוז מענה',
    unavailable: 'לא זמין',
    addInvited: 'הזינו כמה הזמנות שלחתם',
    outOf: (invited: number) => `מתוך ${invited} הזמנות · שינוי`,
  },
  en: {
    question: 'How many invitations did you send?',
    placeholder: 'For example 120',
    saving: 'Saving…',
    save: 'Save',
    cancel: 'Cancel',
    hint: 'Used only to calculate the response rate. Leave blank if you do not know.',
    title: 'Response rate',
    unavailable: 'Not available',
    addInvited: 'Enter how many invitations you sent',
    outOf: (invited: number) => `Out of ${invited} invitations · change`,
  },
} as const;

interface ResponseRateTileProps {
  readonly eventId: string;
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
  const locale = useAppLocale();
  const copy = COPY[locale];
  const [state, formAction, isPending] = useActionState(updateExpectedGuestsAction, INITIAL);
  const [editing, setEditing] = useState(false);
  const fieldId = useId();
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
          <input type="hidden" name="locale" value={locale} />
          <label htmlFor={fieldId} className="text-muted-foreground text-xs sm:text-sm">
            {copy.question}
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
            placeholder={copy.placeholder}
            aria-invalid={state.status === 'error' || undefined}
            aria-describedby={state.status === 'error' ? `${fieldId}-error` : undefined}
            className="border-input bg-card focus-visible:border-primary w-full rounded-lg border px-3 py-2 text-base focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[--color-ring]"
          />
          {state.status === 'error' && (
            <p id={`${fieldId}-error`} role="alert" className="text-destructive text-xs">
              {state.message}
            </p>
          )}
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={isPending}>
              {isPending ? copy.saving : copy.save}
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => setEditing(false)}>
              {copy.cancel}
            </Button>
          </div>
          <p className="text-muted-foreground text-xs leading-relaxed">{copy.hint}</p>
        </form>
      </Card>
    );
  }

  return (
    <Card padding="none" className="flex flex-col justify-between p-4 sm:p-5">
      <p className="text-muted-foreground text-xs sm:text-sm">{copy.title}</p>
      <p className="text-primary mt-2 font-[family-name:var(--font-display)] text-2xl leading-none font-bold tabular-nums">
        {percentage === null ? copy.unavailable : `${percentage}%`}
      </p>
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="text-accent-strong mt-1.5 self-start rounded-sm text-xs underline underline-offset-2 hover:no-underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[--color-ring]"
      >
        {percentage === null ? copy.addInvited : copy.outOf(invited)}
      </button>
      <p role="status" aria-live="polite" className="sr-only">
        {state.status === 'saved' ? state.message : ''}
      </p>
    </Card>
  );
}
