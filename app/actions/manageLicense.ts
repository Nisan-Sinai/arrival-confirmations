'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { normalizeLicenseChange } from '@/app/_lib/licenseChange';
import { assertPlatformOwner } from '@/app/_lib/platformAdmin';
import {
  LICENSE_STATUSES,
  PAYMENT_METHODS,
  type LicenseStatus,
  type PaymentMethod,
  type PlanCode,
} from '@/app/_lib/plans';
import { recordEventLicense } from '@/app/_lib/eventLicenses';
import { createPrivilegedClient } from '@/lib/server/supabase';

function optionalText(value: FormDataEntryValue | null): string | null {
  const text = typeof value === 'string' ? value.trim() : '';
  return text === '' ? null : text.slice(0, 500);
}

function planValue(value: FormDataEntryValue | null): Exclude<PlanCode, 'legacy'> | null {
  return value === 'trial' || value === 'basic' || value === 'premium' || value === 'pro'
    ? value
    : null;
}

function statusValue(value: FormDataEntryValue | null): LicenseStatus | null {
  return typeof value === 'string' && LICENSE_STATUSES.includes(value as LicenseStatus)
    ? (value as LicenseStatus)
    : null;
}

function paymentMethodValue(value: FormDataEntryValue | null): PaymentMethod | null {
  return typeof value === 'string' && PAYMENT_METHODS.includes(value as PaymentMethod)
    ? (value as PaymentMethod)
    : null;
}

function nonNegativeIntegerValue(value: FormDataEntryValue | null): number | null {
  if (typeof value !== 'string' || value.trim() === '') return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : null;
}

function successRedirectPath(eventId: string, query: string | null): string {
  const search = new URLSearchParams({ updated: eventId });
  if (query !== null) search.set('q', query.slice(0, 200));
  return `/admin/plans?${search.toString()}`;
}

export async function updateEventLicenseAction(formData: FormData): Promise<void> {
  const admin = await assertPlatformOwner();

  const eventId = optionalText(formData.get('eventId'));
  const plan = planValue(formData.get('plan'));
  const submittedStatus = statusValue(formData.get('status'));
  if (eventId === null || plan === null || submittedStatus === null) {
    throw new Error('Invalid event license request');
  }

  const privileged = createPrivilegedClient();
  const { data: event, error } = await privileged
    .from('events')
    .select('id')
    .eq('id', eventId)
    .maybeSingle();
  if (error || event === null) throw new Error('Event not found');

  const normalized = normalizeLicenseChange({
    plan,
    submittedStatus,
    submittedPrice:
      typeof formData.get('price') === 'string' ? (formData.get('price') as string) : null,
    previousPlan: planValue(formData.get('currentPlan')),
    previousPriceAgorot: nonNegativeIntegerValue(formData.get('currentPriceAgorot')),
  });

  await recordEventLicense({
    eventId,
    adminUserId: admin.id,
    plan,
    status: normalized.status,
    priceAgorot: normalized.priceAgorot,
    paymentMethod: paymentMethodValue(formData.get('paymentMethod')),
    paymentReference: optionalText(formData.get('paymentReference')),
    notes: optionalText(formData.get('notes')),
  });

  revalidatePath('/admin/plans');
  revalidatePath('/dashboard');
  revalidatePath(`/dashboard/events/${eventId}`);
  revalidatePath(`/dashboard/events/${eventId}/tools`);
  revalidatePath('/e', 'layout');

  redirect(successRedirectPath(eventId, optionalText(formData.get('q'))));
}
