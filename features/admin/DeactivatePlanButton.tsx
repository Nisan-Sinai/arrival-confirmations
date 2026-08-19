'use client';

import { useActionState } from 'react';

import { deactivatePlanAction, type BillingActionState } from '@/app/actions/manageBilling';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/feedback';
import { useAppLocale } from '@/features/i18n/AppLocaleProvider';

const INITIAL: BillingActionState = { status: 'idle', message: '' };

const COPY = {
  he: {
    confirm: 'להפסיק את המסלול הפעיל לאירוע הזה?',
    working: 'מפסיק…',
    button: 'הפסקת מסלול',
  },
  en: {
    confirm: 'Stop the active plan for this event?',
    working: 'Stopping…',
    button: 'Stop plan',
  },
} as const;

export function DeactivatePlanButton({ eventId }: { readonly eventId: string }) {
  const locale = useAppLocale();
  const copy = COPY[locale];
  const [state, action, pending] = useActionState(deactivatePlanAction, INITIAL);

  return (
    <div>
      <form
        action={action}
        onSubmit={(event) => {
          if (!window.confirm(copy.confirm)) event.preventDefault();
        }}
      >
        <input type="hidden" name="eventId" value={eventId} />
        <input type="hidden" name="locale" value={locale} />
        <Button type="submit" variant="destructive" size="sm" disabled={pending}>
          {pending ? copy.working : copy.button}
        </Button>
      </form>
      {state.status !== 'idle' && (
        <Alert className="mt-2" tone={state.status === 'success' ? 'success' : 'error'}>
          {state.message}
        </Alert>
      )}
    </div>
  );
}
