'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import type { SupabaseClient } from '@supabase/supabase-js';

import { assertPlatformOwner } from '@/app/_lib/platformAdmin';
import type { EventFormState } from '@/app/actions/manageEvent';
import { isEventType } from '@/config/eventTypes';
import { normalizeIsraeliPhone, PhoneNormalizationError } from '@/lib/phone';
import { createPrivilegedClient } from '@/lib/server/supabase';
import type { Database, Json } from '@/types/database.types';
import type { GuestUpdate } from '@/types/guestDatabase.types';

type EventWrite = Database['public']['Tables']['events']['Update'];
type GuestWrite = GuestUpdate;

function optional(value: FormDataEntryValue | null): string | null {
  const text = typeof value === 'string' ? value.trim() : '';
  return text === '' ? null : text;
}

function optionalCount(value: FormDataEntryValue | null): number | null {
  const text = optional(value);
  if (text === null) return null;
  const parsed = Number(text);
  return Number.isInteger(parsed) && parsed > 0 && parsed <= 5000 ? parsed : null;
}

function positivePartySize(value: FormDataEntryValue | null): number | null {
  const text = optional(value);
  if (text === null) return 1;
  const parsed = Number(text);
  return Number.isInteger(parsed) && parsed > 0 && parsed <= 100 ? parsed : null;
}

function safeUrl(value: FormDataEntryValue | null): string | null {
  const text = optional(value);
  return text !== null && /^https:\/\//.test(text) ? text : null;
}

function eventIdFrom(formData: FormData): string | null {
  const eventId = optional(formData.get('eventId'));
  return eventId === null ? null : eventId.slice(0, 100);
}

function adminEventPath(eventId: string, params: Record<string, string> = {}): string {
  const search = new URLSearchParams(params);
  const suffix = search.size === 0 ? '' : `?${search.toString()}`;
  return `/admin/events/${eventId}${suffix}`;
}

async function requireExistingEvent(eventId: string): Promise<void> {
  const privileged = createPrivilegedClient() as unknown as SupabaseClient;
  const { data, error } = await privileged
    .from('events')
    .select('id')
    .eq('id', eventId)
    .maybeSingle();
  if (error || data === null) throw new Error('Customer event not found');
}

async function recordAudit({
  adminUserId,
  action,
  entityType,
  entityId,
  metadata,
}: {
  adminUserId: string;
  action: string;
  entityType: string;
  entityId: string;
  metadata: Json;
}): Promise<void> {
  const privileged = createPrivilegedClient() as unknown as SupabaseClient;
  const { error } = await privileged.from('audit_logs').insert({
    admin_user_id: adminUserId,
    action,
    entity_type: entityType,
    entity_id: entityId,
    metadata,
  });
  if (error) throw new Error(`Admin audit write failed: ${error.code}`);
}

function parseEventForm(formData: FormData): {
  values: EventWrite;
  errors: Record<string, string>;
} {
  const errors: Record<string, string> = {};
  const title = optional(formData.get('title'));
  const hostsNames = optional(formData.get('hostsNames'));
  const honoree = optional(formData.get('honoreeDisplayName'));
  const eventDate = optional(formData.get('eventDate'));
  const venueName = optional(formData.get('venueName'));
  const address = optional(formData.get('address'));
  const eventType = formData.get('eventType');

  if (title === null) errors['title'] = 'שדה חובה';
  if (hostsNames === null) errors['hostsNames'] = 'שדה חובה';
  if (honoree === null) errors['honoreeDisplayName'] = 'שדה חובה';
  if (venueName === null) errors['venueName'] = 'שדה חובה';
  if (address === null) errors['address'] = 'שדה חובה';
  if (eventDate === null || !/^\d{4}-\d{2}-\d{2}$/.test(eventDate)) {
    errors['eventDate'] = 'יש לבחור תאריך';
  }
  if (!isEventType(eventType)) errors['eventType'] = 'יש לבחור סוג אירוע';

  return {
    values: {
      title: title ?? '',
      hosts_names: hostsNames ?? '',
      honoree_display_name: honoree ?? '',
      event_date: eventDate ?? '',
      event_type: isEventType(eventType) ? eventType : 'other',
      venue_name: venueName ?? '',
      address: address ?? '',
      ceremony_time: optional(formData.get('ceremonyTime')),
      reception_time: optional(formData.get('receptionTime')),
      contact_phone: optional(formData.get('contactPhone')),
      description: optional(formData.get('description')),
      side_a_label: optional(formData.get('sideALabel')),
      side_b_label: optional(formData.get('sideBLabel')),
      waze_url: safeUrl(formData.get('wazeUrl')),
      google_maps_url: safeUrl(formData.get('googleMapsUrl')),
      gift_url: safeUrl(formData.get('giftUrl')),
      expected_guests: optionalCount(formData.get('expectedGuests')),
      is_active: formData.get('isActive') === 'on',
    },
    errors,
  };
}

export async function adminUpdateCustomerEventAction(
  _previous: EventFormState,
  formData: FormData,
): Promise<EventFormState> {
  const admin = await assertPlatformOwner();
  const eventId = eventIdFrom(formData);
  if (eventId === null) {
    return { status: 'error', message: 'הפעולה נכשלה.', fieldErrors: {} };
  }

  const { values, errors } = parseEventForm(formData);
  if (Object.keys(errors).length > 0) {
    return { status: 'error', message: '', fieldErrors: errors, values };
  }

  const privileged = createPrivilegedClient() as unknown as SupabaseClient;
  const { data: updated, error } = await privileged
    .from('events')
    .update(values)
    .eq('id', eventId)
    .select('id');

  if (error || updated === null || updated.length === 0) {
    return {
      status: 'error',
      message: 'שמירת האירוע נכשלה.',
      fieldErrors: {},
      values,
    };
  }

  await recordAudit({
    adminUserId: admin.id,
    action: 'admin_customer_event_updated',
    entityType: 'event',
    entityId: eventId,
    metadata: { title: values.title, isActive: values.is_active },
  });

  revalidatePath('/admin/plans');
  revalidatePath(`/admin/events/${eventId}`);
  revalidatePath(`/admin/events/${eventId}/edit`);
  revalidatePath('/dashboard');
  revalidatePath(`/dashboard/events/${eventId}`);
  revalidatePath('/e', 'layout');
  redirect(adminEventPath(eventId, { saved: 'event' }));
}

export async function adminTransferCustomerEventAction(formData: FormData): Promise<void> {
  const admin = await assertPlatformOwner();
  const eventId = eventIdFrom(formData);
  const targetUserId = optional(formData.get('targetUserId'))?.slice(0, 100) ?? null;

  if (eventId === null) throw new Error('Invalid admin event transfer request');
  if (targetUserId === null) redirect(adminEventPath(eventId, { error: 'owner-required' }));

  const privileged = createPrivilegedClient() as unknown as SupabaseClient;
  const [{ data: event, error: eventError }, { data: targetData, error: targetError }] =
    await Promise.all([
      privileged.from('events').select('id, owner_user_id, title').eq('id', eventId).maybeSingle(),
      privileged.auth.admin.getUserById(targetUserId),
    ]);

  if (eventError || event === null) {
    redirect(adminEventPath(eventId, { error: 'owner-transfer' }));
  }

  const targetUser = targetData.user;
  if (
    targetError ||
    targetUser === null ||
    typeof targetUser.email !== 'string' ||
    typeof targetUser.email_confirmed_at !== 'string'
  ) {
    redirect(adminEventPath(eventId, { error: 'owner-user' }));
  }

  if (event.owner_user_id === targetUser.id) {
    redirect(adminEventPath(eventId, { error: 'owner-same' }));
  }

  const { data: updated, error: updateError } = await privileged
    .from('events')
    .update({ owner_user_id: targetUser.id })
    .eq('id', eventId)
    .select('id');

  if (updateError || updated === null || updated.length === 0) {
    redirect(adminEventPath(eventId, { error: 'owner-transfer' }));
  }

  await recordAudit({
    adminUserId: admin.id,
    action: 'admin_event_owner_transferred',
    entityType: 'event',
    entityId: eventId,
    metadata: {
      previousOwnerUserId: event.owner_user_id,
      newOwnerUserId: targetUser.id,
      newOwnerEmail: targetUser.email,
    },
  });

  revalidatePath('/admin/events');
  revalidatePath('/admin/plans');
  revalidatePath(`/admin/events/${eventId}`);
  revalidatePath('/dashboard');
  revalidatePath(`/dashboard/events/${eventId}`);
  revalidatePath(`/dashboard/events/${eventId}/guests`);
  redirect(adminEventPath(eventId, { saved: 'owner-transferred' }));
}

export async function adminSaveGuestAction(formData: FormData): Promise<void> {
  const admin = await assertPlatformOwner();
  const eventId = eventIdFrom(formData);
  const guestId = optional(formData.get('guestId'));
  const fullName = optional(formData.get('fullName'));
  const phone = optional(formData.get('phone'));
  const partySize = positivePartySize(formData.get('partySize'));

  if (eventId === null || fullName === null || phone === null || partySize === null) {
    if (eventId === null) throw new Error('Invalid admin guest request');
    redirect(adminEventPath(eventId, { error: 'guest-fields' }));
  }

  await requireExistingEvent(eventId);

  let normalized: string;
  try {
    normalized = normalizeIsraeliPhone(phone);
  } catch (error) {
    if (error instanceof PhoneNormalizationError) {
      redirect(adminEventPath(eventId, { error: 'guest-phone' }));
    }
    throw error;
  }

  const privileged = createPrivilegedClient() as unknown as SupabaseClient;
  let duplicateQuery = privileged
    .from('guests')
    .select('id')
    .eq('event_id', eventId)
    .eq('phone_normalized', normalized);
  if (guestId !== null) duplicateQuery = duplicateQuery.neq('id', guestId);
  const { data: duplicate } = await duplicateQuery.maybeSingle();
  if (guestId !== null && duplicate !== null) {
    redirect(adminEventPath(eventId, { error: 'guest-duplicate' }));
  }
  const effectiveGuestId = guestId ?? duplicate?.id ?? null;

  const values: GuestWrite = {
    full_name: fullName.slice(0, 200),
    phone: phone.slice(0, 40),
    phone_normalized: normalized,
    email: optional(formData.get('email'))?.slice(0, 320) ?? null,
    party_size: partySize,
    table_name: optional(formData.get('tableName'))?.slice(0, 100) ?? null,
    seat_number: optional(formData.get('seatNumber'))?.slice(0, 50) ?? null,
    notes: optional(formData.get('notes'))?.slice(0, 1000) ?? null,
    is_active: true,
    token_revoked_at: null,
  };

  let savedGuestId = effectiveGuestId;
  if (effectiveGuestId === null) {
    const { data, error } = await privileged
      .from('guests')
      .insert({
        event_id: eventId,
        full_name: values.full_name ?? '',
        phone: values.phone ?? '',
        phone_normalized: values.phone_normalized ?? '',
        email: values.email,
        party_size: values.party_size ?? 1,
        table_name: values.table_name,
        seat_number: values.seat_number,
        notes: values.notes,
        import_source: 'admin_manual',
        is_active: true,
      })
      .select('id')
      .single();
    if (error || data === null) redirect(adminEventPath(eventId, { error: 'guest-save' }));
    savedGuestId = data.id;
  } else {
    const { data, error } = await privileged
      .from('guests')
      .update(values)
      .eq('event_id', eventId)
      .eq('id', effectiveGuestId)
      .select('id');
    if (error || data === null || data.length === 0) {
      redirect(adminEventPath(eventId, { error: 'guest-save' }));
    }
  }

  if (savedGuestId === null) throw new Error('Guest save returned no id');
  const mergedDuplicate = guestId === null && duplicate !== null;
  await recordAudit({
    adminUserId: admin.id,
    action: mergedDuplicate
      ? 'admin_guest_merged'
      : guestId === null
        ? 'admin_guest_added'
        : 'admin_guest_updated',
    entityType: 'guest',
    entityId: savedGuestId,
    metadata: {
      eventId,
      fullName: values.full_name,
      phoneNormalized: normalized,
      mergedDuplicate,
    },
  });

  revalidatePath(`/admin/events/${eventId}`);
  revalidatePath(`/dashboard/events/${eventId}`);
  revalidatePath(`/dashboard/events/${eventId}/guests`);
  redirect(
    adminEventPath(eventId, {
      saved: mergedDuplicate ? 'guest-merged' : guestId === null ? 'guest-added' : 'guest-updated',
    }),
  );
}

export async function adminResetGuestListAction(formData: FormData): Promise<void> {
  const admin = await assertPlatformOwner();
  const eventId = eventIdFrom(formData);
  if (eventId === null) throw new Error('Invalid admin guest reset request');

  await requireExistingEvent(eventId);
  const privileged = createPrivilegedClient() as unknown as SupabaseClient;
  const now = new Date().toISOString();

  const { error: sessionError } = await privileged
    .from('invite_sessions')
    .update({ revoked_at: now })
    .eq('event_id', eventId)
    .is('revoked_at', null);
  if (sessionError) redirect(adminEventPath(eventId, { error: 'guests-reset' }));

  const { data, error } = await privileged
    .from('guests')
    .update({
      is_active: false,
      email: null,
      party_size: 1,
      family_side: null,
      table_id: null,
      table_name: null,
      seat_number: null,
      seating_group: null,
      meal_preference: null,
      accessibility_needs: null,
      seating_priority: 0,
      seat_locked: false,
      notes: null,
      checked_in_at: null,
      import_source: null,
      invite_token_hash: null,
      token_expires_at: null,
      token_revoked_at: now,
      invite_link_issued_at: null,
      invite_first_opened_at: null,
      invite_last_opened_at: null,
      invite_open_count: 0,
      invite_last_response_at: null,
      invite_last_response_status: null,
    })
    .eq('event_id', eventId)
    .eq('is_active', true)
    .select('id');

  if (error || data === null) redirect(adminEventPath(eventId, { error: 'guests-reset' }));

  await recordAudit({
    adminUserId: admin.id,
    action: 'admin_guest_list_reset',
    entityType: 'event',
    entityId: eventId,
    metadata: {
      eventId,
      guestCount: data.length,
      softDelete: true,
      inviteSessionsRevoked: true,
    },
  });

  revalidatePath(`/admin/events/${eventId}`);
  revalidatePath(`/dashboard/events/${eventId}`);
  revalidatePath(`/dashboard/events/${eventId}/guests`);
  redirect(adminEventPath(eventId, { saved: 'guests-reset', count: String(data.length) }));
}

export async function adminDeleteGuestAction(formData: FormData): Promise<void> {
  const admin = await assertPlatformOwner();
  const eventId = eventIdFrom(formData);
  const guestId = optional(formData.get('guestId'));
  if (eventId === null || guestId === null) throw new Error('Invalid admin guest deletion');

  await requireExistingEvent(eventId);
  const privileged = createPrivilegedClient() as unknown as SupabaseClient;
  const { data, error } = await privileged
    .from('guests')
    .update({ is_active: false, token_revoked_at: new Date().toISOString() })
    .eq('event_id', eventId)
    .eq('id', guestId)
    .select('id, full_name');
  if (error || data === null || data.length === 0) {
    redirect(adminEventPath(eventId, { error: 'guest-delete' }));
  }

  await recordAudit({
    adminUserId: admin.id,
    action: 'admin_guest_deleted',
    entityType: 'guest',
    entityId: guestId,
    metadata: { eventId, fullName: data[0]?.full_name ?? null, softDelete: true },
  });

  revalidatePath(`/admin/events/${eventId}`);
  revalidatePath(`/dashboard/events/${eventId}`);
  revalidatePath(`/dashboard/events/${eventId}/guests`);
  redirect(adminEventPath(eventId, { saved: 'guest-deleted' }));
}
