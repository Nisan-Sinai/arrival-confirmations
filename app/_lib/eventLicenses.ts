import 'server-only';

import {
  getPlanDefinition,
  type LicenseStatus,
  type PaymentMethod,
  type PlanCode,
} from '@/app/_lib/plans';
import { createPrivilegedClient } from '@/lib/server/supabase';
import type { Json } from '@/types/database.types';

export interface EventLicenseSnapshot {
  readonly eventId: string;
  readonly plan: PlanCode;
  readonly status: LicenseStatus | 'legacy';
  readonly priceAgorot: number;
  readonly paymentMethod: PaymentMethod | null;
  readonly paymentReference: string | null;
  readonly notes: string | null;
  readonly changedAt: string | null;
  readonly changedBy: string | null;
}

interface LicenseAuditRow {
  readonly entity_id: string | null;
  readonly admin_user_id: string | null;
  readonly created_at: string;
  readonly metadata: Json;
}

function isRecord(value: Json): value is { [key: string]: Json | undefined } {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function stringValue(value: Json | undefined): string | null {
  return typeof value === 'string' && value.trim() !== '' ? value : null;
}

function numberValue(value: Json | undefined): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function isPlanCode(value: string | null): value is PlanCode {
  return (
    value === 'trial' ||
    value === 'basic' ||
    value === 'premium' ||
    value === 'pro' ||
    value === 'legacy'
  );
}

function isLicenseStatus(value: string | null): value is LicenseStatus {
  return (
    value === 'trial' ||
    value === 'pending_payment' ||
    value === 'active' ||
    value === 'cancelled' ||
    value === 'refunded'
  );
}

function isPaymentMethod(value: string | null): value is PaymentMethod {
  return (
    value === 'phone' ||
    value === 'bit' ||
    value === 'bank_transfer' ||
    value === 'cash' ||
    value === 'other'
  );
}

function legacyEventLicense(eventId: string): EventLicenseSnapshot {
  return {
    eventId,
    plan: 'legacy',
    status: 'legacy',
    priceAgorot: 0,
    paymentMethod: null,
    paymentReference: null,
    notes: null,
    changedAt: null,
    changedBy: null,
  };
}

export function trialEventLicense(eventId: string): EventLicenseSnapshot {
  return {
    eventId,
    plan: 'trial',
    status: 'trial',
    priceAgorot: 0,
    paymentMethod: null,
    paymentReference: null,
    notes: null,
    changedAt: null,
    changedBy: null,
  };
}

function parseLicenseRow(row: LicenseAuditRow): EventLicenseSnapshot | null {
  if (row.entity_id === null || !isRecord(row.metadata)) return null;

  const plan = stringValue(row.metadata['plan']);
  const status = stringValue(row.metadata['status']);
  if (!isPlanCode(plan) || plan === 'legacy' || !isLicenseStatus(status)) return null;

  const paymentMethod = stringValue(row.metadata['payment_method']);

  return {
    eventId: row.entity_id,
    plan,
    status,
    priceAgorot: numberValue(row.metadata['price_agorot']) ?? 0,
    paymentMethod: isPaymentMethod(paymentMethod) ? paymentMethod : null,
    paymentReference: stringValue(row.metadata['payment_reference']),
    notes: stringValue(row.metadata['notes']),
    changedAt: row.created_at,
    changedBy: row.admin_user_id,
  };
}

export async function getEventLicenses(
  eventIds: readonly string[],
  fallback: 'legacy' | 'trial' = 'legacy',
): Promise<Map<string, EventLicenseSnapshot>> {
  const result = new Map<string, EventLicenseSnapshot>();
  for (const eventId of eventIds) {
    result.set(
      eventId,
      fallback === 'trial' ? trialEventLicense(eventId) : legacyEventLicense(eventId),
    );
  }
  if (eventIds.length === 0) return result;

  const supabase = createPrivilegedClient();
  const { data, error } = await supabase
    .from('audit_logs')
    .select('entity_id, admin_user_id, created_at, metadata')
    .eq('entity_type', 'event_license')
    .in('entity_id', [...eventIds])
    .order('created_at', { ascending: false });

  if (error) {
    console.error('event license read failed', { code: error.code });
    return result;
  }

  for (const row of data ?? []) {
    if (row.entity_id === null) continue;
    const current = result.get(row.entity_id);
    if (current?.changedAt !== null) continue;
    const parsed = parseLicenseRow(row);
    if (parsed !== null) result.set(row.entity_id, parsed);
  }

  return result;
}

export async function getEventLicense(
  eventId: string,
  fallback: 'legacy' | 'trial' = 'legacy',
): Promise<EventLicenseSnapshot> {
  const licenses = await getEventLicenses([eventId], fallback);
  return (
    licenses.get(eventId) ??
    (fallback === 'trial' ? trialEventLicense(eventId) : legacyEventLicense(eventId))
  );
}

export async function recordEventLicense(input: {
  readonly eventId: string;
  readonly adminUserId: string;
  readonly plan: Exclude<PlanCode, 'legacy'>;
  readonly status: LicenseStatus;
  readonly priceAgorot: number;
  readonly paymentMethod: PaymentMethod | null;
  readonly paymentReference: string | null;
  readonly notes: string | null;
}): Promise<void> {
  const supabase = createPrivilegedClient();
  const { error } = await supabase.from('audit_logs').insert({
    action: 'event_license_updated',
    admin_user_id: input.adminUserId,
    entity_id: input.eventId,
    entity_type: 'event_license',
    metadata: {
      event_id: input.eventId,
      plan: input.plan,
      status: input.status,
      price_agorot: input.priceAgorot,
      payment_method: input.paymentMethod,
      payment_reference: input.paymentReference,
      notes: input.notes,
    },
  });

  if (error) throw new Error(`event license write failed: ${error.code}`);
}

function attendeeLimitForLicense(license: EventLicenseSnapshot): number {
  if (license.plan === 'legacy') return 5_000;
  return getPlanDefinition(license.plan)?.attendeeLimit ?? 0;
}

export function canAcceptRsvp(
  license: EventLicenseSnapshot,
  currentRsvpCount: number,
  alreadyExists: boolean,
): boolean {
  if (
    license.status === 'cancelled' ||
    license.status === 'refunded' ||
    license.status === 'pending_payment'
  ) {
    return false;
  }
  if (
    license.status === 'active' &&
    license.plan !== 'basic' &&
    license.plan !== 'premium' &&
    license.plan !== 'pro'
  ) {
    return false;
  }
  return alreadyExists || currentRsvpCount < attendeeLimitForLicense(license);
}
