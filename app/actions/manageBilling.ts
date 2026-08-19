'use server';

import { revalidatePath } from 'next/cache';

import { PLATFORM_OWNER_EMAIL } from '@/app/_lib/platformAdmin';
import {
  isPaymentMethod,
  isSellablePlanCode,
  type PaymentMethod,
  type SellablePlanCode,
} from '@/app/_lib/plans';
import { defaultLocale, isLocale, localePath, type Locale } from '@/lib/i18n';
import { createPrivilegedClient, createUserClient } from '@/lib/server/supabase';

export interface BillingActionState {
  readonly status: 'idle' | 'success' | 'error';
  readonly message: string;
}

const COPY = {
  he: {
    denied: 'אין הרשאה לפעולה הזאת.',
    invalid: 'פרטי ההפעלה אינם תקינים.',
    eventMissing: 'האירוע לא נמצא.',
    failed: 'הפעלת המסלול נכשלה.',
    activated: 'המסלול הופעל בהצלחה.',
    stopped: 'המסלול הופסק.',
    stopFailed: 'הפסקת המסלול נכשלה.',
  },
  en: {
    denied: 'You do not have permission to perform this action.',
    invalid: 'The activation details are invalid.',
    eventMissing: 'The event was not found.',
    failed: 'We could not activate the plan.',
    activated: 'The plan was activated successfully.',
    stopped: 'The plan was stopped.',
    stopFailed: 'We could not stop the plan.',
  },
} as const;

function optional(value: FormDataEntryValue | null): string | null {
  const text = typeof value === 'string' ? value.trim() : '';
  return text === '' ? null : text;
}

function localeOf(formData: FormData): Locale {
  const value = formData.get('locale');
  return typeof value === 'string' && isLocale(value) ? value : defaultLocale;
}

async function platformOwner(): Promise<string | null> {
  const supabase = await createUserClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user?.email?.toLowerCase() !== PLATFORM_OWNER_EMAIL) return null;
  return user.id;
}

function paymentLabel(method: PaymentMethod): string {
  return method;
}

export async function activatePlanAction(
  _previous: BillingActionState,
  formData: FormData,
): Promise<BillingActionState> {
  const locale = localeOf(formData);
  const copy = COPY[locale];
  const adminUserId = await platformOwner();
  if (adminUserId === null) return { status: 'error', message: copy.denied };

  const eventId = optional(formData.get('eventId'));
  const planCode = formData.get('planCode');
  const paymentMethod = formData.get('paymentMethod');
  const paymentReference = optional(formData.get('paymentReference'));
  if (
    eventId === null ||
    !isSellablePlanCode(planCode) ||
    !isPaymentMethod(paymentMethod)
  ) {
    return { status: 'error', message: copy.invalid };
  }

  const db = createPrivilegedClient();
  const { data: event, error: eventError } = await db
    .from('events')
    .select('id')
    .eq('id', eventId)
    .maybeSingle();
  if (eventError || event === null) return { status: 'error', message: copy.eventMissing };

  const now = new Date().toISOString();
  const { error } = await db.from('event_licenses').upsert(
    {
      event_id: eventId,
      plan_code: planCode as SellablePlanCode,
      status: 'active',
      payment_method: paymentMethod as PaymentMethod,
      payment_reference: paymentReference,
      activated_at: now,
      changed_at: now,
      changed_by: adminUserId,
    },
    { onConflict: 'event_id' },
  );
  if (error) return { status: 'error', message: copy.failed };

  await db.from('audit_logs').insert({
    admin_user_id: adminUserId,
    action: 'event_plan_activated',
    entity_type: 'event',
    entity_id: eventId,
    metadata: { planCode, paymentMethod: paymentLabel(paymentMethod), paymentReference, locale },
  });

  revalidatePath(localePath(locale, '/admin/plans'));
  revalidatePath(localePath(locale, '/dashboard'));
  revalidatePath(localePath(locale, `/dashboard/events/${eventId}`));
  return { status: 'success', message: copy.activated };
}

export async function deactivatePlanAction(
  _previous: BillingActionState,
  formData: FormData,
): Promise<BillingActionState> {
  const locale = localeOf(formData);
  const copy = COPY[locale];
  const adminUserId = await platformOwner();
  if (adminUserId === null) return { status: 'error', message: copy.denied };

  const eventId = optional(formData.get('eventId'));
  if (eventId === null) return { status: 'error', message: copy.invalid };

  const db = createPrivilegedClient();
  const now = new Date().toISOString();
  const { error } = await db
    .from('event_licenses')
    .update({ status: 'cancelled', changed_at: now, changed_by: adminUserId })
    .eq('event_id', eventId);
  if (error) return { status: 'error', message: copy.stopFailed };

  await db.from('audit_logs').insert({
    admin_user_id: adminUserId,
    action: 'event_plan_cancelled',
    entity_type: 'event',
    entity_id: eventId,
    metadata: { locale },
  });

  revalidatePath(localePath(locale, '/admin/plans'));
  revalidatePath(localePath(locale, '/dashboard'));
  revalidatePath(localePath(locale, `/dashboard/events/${eventId}`));
  return { status: 'success', message: copy.stopped };
}
