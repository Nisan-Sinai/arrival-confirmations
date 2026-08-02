'use client';

import { useActionState } from 'react';

import {
  submitPersonalRsvpAction,
  type PersonalRsvpState,
} from '@/app/actions/submitPersonalRsvp';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Alert } from '@/components/ui/feedback';

const INITIAL_STATE: PersonalRsvpState = { status: 'idle', message: '' };

const OPTIONS = [
  { value: 'attending', label: 'מגיע/ה', description: 'נגיע בשמחה', variant: 'default' },
  { value: 'not_attending', label: 'לא מגיע/ה', description: 'לא נוכל להגיע', variant: 'outline' },
  { value: 'maybe', label: 'אולי', description: 'עדיין לא בטוחים', variant: 'secondary' },
] as const;

function statusLabel(status: 'attending' | 'not_attending' | 'maybe'): string {
  if (status === 'attending') return 'מגיע/ה';
  if (status === 'not_attending') return 'לא מגיע/ה';
  return 'אולי';
}

export function PersonalRsvpButtons({
  guestName,
  partySize,
  currentStatus,
}: {
  guestName: string;
  partySize: number;
  currentStatus: 'attending' | 'not_attending' | 'maybe' | null;
}) {
  const [state, formAction, isPending] = useActionState(submitPersonalRsvpAction, INITIAL_STATE);
  const selected = state.selected ?? currentStatus;

  return (
    <Card padding="lg" className="border-accent/30">
      <div className="text-center">
        <p className="text-eyebrow text-accent-strong font-semibold">קישור אישי</p>
        <h2 className="text-h2 text-primary mt-2 font-bold">שלום {guestName}</h2>
        <p className="text-muted-foreground mt-3 leading-relaxed">
          אין צורך למלא שם או טלפון. בחרו תשובה אחת וזה הכול.
          {partySize > 1 ? ` ההזמנה משויכת ל-${partySize} אנשים.` : ''}
        </p>
      </div>

      {selected !== null && state.status !== 'success' && (
        <p className="border-border bg-secondary/30 mt-5 rounded-xl border px-4 py-3 text-center text-sm">
          הבחירה הנוכחית: <strong>{statusLabel(selected)}</strong>
        </p>
      )}

      <form action={formAction} className="mt-6 grid gap-3 sm:grid-cols-3">
        {OPTIONS.map((option) => (
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
          שומר את הבחירה…
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
        אפשר לחזור לקישור ולשנות את הבחירה כל עוד הוא בתוקף.
      </p>
    </Card>
  );
}
