'use server';

import { revalidatePath } from 'next/cache';

import { assertPlatformOwner } from '@/app/_lib/platformAdmin';
import {
  LICENSE_STATUSES,
  PAYMENT_METHODS,
  getPlanDefinition,
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
  return value === 'trial' || value === 'basic' || value === 'premium' ? value : null;
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

function priceValue(value: FormDataEntryValue | null, fallbackAgorot: number): number {
  if (typeof value !== 'string' || value.trim() === '') return fallbackAgorot;
  const shekels = Number(value);
  if (!Number.isFinite(shekels) || shekels < 0 || shekels > 10_000) return fallbackAgorot;
  return Math.round(shekels * 100);
}

export async function updateEventLicenseAction(formData: FormData): Promise<void> {
  const admin = await assertPlatformOwner();

  const eventId = optionalText(formData.get('eventId'));
  const plan = planValue(formData.get('plan'));
  const status = statusValue(formData.get('status'));
  if (eventId === null || plan === null || status === null) {
    throw new Error('Invalid event license request');
  }

  const privileged = createPrivilegedClient();
  const { data: event, error } = await privileged
    .from('events')
    .select('id')
    .eq('id', eventId)
    .maybeSingle();
  if (error || event === null) throw new Error('Event not found');

  const defaultPrice = getPlanDefinition(plan)?.priceAgorot ?? 0;
  const paymentMethod = paymentMethodValue(formData.get('paymentMethod'));

  await recordEventLicense({
    eventId,
    adminUserId: admin.id,
    plan,
    status,
    priceAgorot: priceValue(formData.get('price'), defaultPrice),
    paymentMethod,
    paymentReference: optionalText(formData.get('paymentReference')),
    notes: optionalText(formData.get('notes')),
  });

  revalidatePath('/admin/plans');
  revalidatePath('/dashboard');
  revalidatePath(`/dashboard/events/${eventId}`);
  revalidatePath('/e', 'layout');
}
