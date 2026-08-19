'use client';

import { useActionState } from 'react';

import { submitPersonalRsvpAction, type PersonalRsvpState } from '@/app/actions/submitPersonalRsvp';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Alert } from '@/components/ui/feedback';
import { getAppCopy } from '@/config/appCopy';
import { useAppLocale } from '@/features/i18n/AppLocaleProvider';

const INITIAL_STATE: PersonalRsvpState = { status: 'idle', message: '' };

type Status = 'attending' | 'not_attending' | 'maybe';

export function PersonalRsvpButtons({
  guestName,
  partySize,
  currentStatus,
}: {
  guestName: string;
  partySize: number;
  currentStatus: Status | null;
}) {
  const locale = useAppLocale();
  const copy = getAppCopy(locale).personalRsvp;
  const options = [
    {
      value: 'attending' as const,
      label: copy.attending,
      description: copy.attendingDescription,
      variant: 'primary' as const,
    },
    {
      value: 'not_attending' as const,
      label: copy.notAttending,
      description: copy.notAttendingDescription,
      variant: 'outline' as const,
    },
    {
      value: 'maybe' as const,
      label: copy.maybe,
      description: copy.maybeDescription,
      variant: 'secondary' as const,
    },
  ];
  const statusLabel = (status: Status): string =>
    status === 'attending'
      ? copy.attending
      : status === 'not_attending'
        ? copy.notAttending
        : copy.maybe;

  const [state, formAction, isPending] = useActionState(submitPersonalRsvpAction, INITIAL_STATE);
  const selected = state.selected ?? currentStatus;

  return (
    <Card padding="lg" className="border-accent/30">
      <div className="text-center">
        <p className="text-eyebrow text-accent-strong font-semibold">{copy.eyebrow}</p>
        <h2 className="text-h2 text-primary mt-2 font-bold">
          {copy.hello} {guestName}
        </h2>
        <p className="text-muted-foreground mt-3 leading-relaxed">
          {copy.intro}
          {partySize > 1 ? ` ${copy.partyPrefix}${partySize}${copy.partySuffix}` : ''}
        </p>
      </div>

      {selected !== null && state.status !== 'success' && (
        <p className="border-border bg-secondary/30 mt-5 rounded-xl border px-4 py-3 text-center text-sm">
          {copy.current} <strong>{statusLabel(selected)}</strong>
        </p>
      )}

      <form action={formAction} className="mt-6 grid gap-3 sm:grid-cols-3">
        <input type="hidden" name="locale" value={locale} />
        {options.map((option) => (
          <Button
            key={option.value}
            type="submit"
            name="attendanceStatus"
            value={option.value}
            variant={option.variant}
            size="lg"
            disabled={isPending}
            aria-pressed={selected === option.value}
            className="h-auto min-h-16 flex-col gap-1 py-3"
          >
            <span>{option.label}</span>
            <span className="text-xs font-normal opacity-80">{option.description}</span>
          </Button>
        ))}
      </form>

      {isPending && (
        <p role="status" className="text-muted-foreground mt-4 text-center text-sm">
          {copy.saving}
        </p>
      )}
      {state.status === 'success' && (
        <Alert tone="success" className="mt-5">
          {state.message}
        </Alert>
      )}
      {state.status === 'error' && (
        <Alert tone="error" className="mt-5">
          {state.message}
        </Alert>
      )}

      <p className="text-muted-foreground mt-5 text-center text-xs leading-relaxed">
        {copy.changeNote}
      </p>
    </Card>
  );
}
