'use client';

import { useActionState } from 'react';

import { activatePlanAction, type BillingActionState } from '@/app/actions/manageBilling';
import {
  getPaymentMethodLabels,
  getPlanCatalog,
  PAYMENT_METHODS,
  type SellablePlanCode,
} from '@/app/_lib/plans';
import { Button } from '@/components/ui/button';
import { Field, Input, Select } from '@/components/ui/field';
import { Alert } from '@/components/ui/feedback';
import { useAppLocale } from '@/features/i18n/AppLocaleProvider';

const INITIAL: BillingActionState = { status: 'idle', message: '' };

const COPY = {
  he: {
    plan: 'מסלול להפעלה',
    payment: 'אמצעי תשלום',
    reference: 'אסמכתא / הערה',
    referencePlaceholder: 'מספר אסמכתא, שם משלם או הערה פנימית',
    activating: 'מפעיל…',
    activate: 'הפעלת המסלול',
  },
  en: {
    plan: 'Plan to activate',
    payment: 'Payment method',
    reference: 'Reference / note',
    referencePlaceholder: 'Reference number, payer name or internal note',
    activating: 'Activating…',
    activate: 'Activate plan',
  },
} as const;

export function ActivatePlanForm({
  eventId,
  defaultPlan = 'basic',
}: {
  readonly eventId: string;
  readonly defaultPlan?: SellablePlanCode;
}) {
  const locale = useAppLocale();
  const copy = COPY[locale];
  const plans = getPlanCatalog(locale).filter(
    (plan): plan is (typeof plan) & { code: SellablePlanCode } => plan.code !== 'trial',
  );
  const paymentLabels = getPaymentMethodLabels(locale);
  const [state, action, pending] = useActionState(activatePlanAction, INITIAL);

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="eventId" value={eventId} />
      <input type="hidden" name="locale" value={locale} />
      <Field label={copy.plan}>
        <Select name="planCode" defaultValue={defaultPlan}>
          {plans.map((plan) => (
            <option key={plan.code} value={plan.code}>
              {plan.name}
            </option>
          ))}
        </Select>
      </Field>
      <Field label={copy.payment}>
        <Select name="paymentMethod" defaultValue="bit">
          {PAYMENT_METHODS.map((method) => (
            <option key={method} value={method}>
              {paymentLabels[method]}
            </option>
          ))}
        </Select>
      </Field>
      <Field label={copy.reference}>
        <Input name="paymentReference" placeholder={copy.referencePlaceholder} />
      </Field>
      {state.status !== 'idle' && (
        <Alert tone={state.status === 'success' ? 'success' : 'error'}>{state.message}</Alert>
      )}
      <Button type="submit" disabled={pending} block>
        {pending ? copy.activating : copy.activate}
      </Button>
    </form>
  );
}
