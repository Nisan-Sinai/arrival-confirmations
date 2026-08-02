'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { GuestImportError, importGuestsFromFile } from '@/lib/guestImport';
import { normalizeIsraeliPhone, PhoneNormalizationError } from '@/lib/phone';
import { createUserClient } from '@/lib/server/supabase';
import type { GuestInsert, GuestSupabaseClient, GuestUpdate } from '@/types/guestDatabase.types';

type GuestWrite = GuestUpdate;

function optional(value: FormDataEntryValue | null): string | null {
  const text = typeof value === 'string' ? value.trim() : '';
  return text === '' ? null : text;
}

function eventPath(eventId: string, params: Record<string, string> = {}): string {
  const search = new URLSearchParams(params);
  const suffix = search.size === 0 ? '' : `?${search.toString()}`;
  return `/dashboard/events/${eventId}/guests${suffix}`;
}

function partySize(value: FormDataEntryValue | null): number | null {
  const text = optional(value);
  if (text === null) return 1;
  const parsed = Number(text);
  return Number.isInteger(parsed) && parsed > 0 && parsed <= 100 ? parsed : null;
}

async function requireOwnedEvent(eventId: string): Promise<GuestSupabaseClient | null> {
  const supabase = await createUserClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user === null) return null;

  const guestDb = supabase as unknown as GuestSupabaseClient;
  const { data, error } = await guestDb.from('events').select('id').eq('id', eventId).maybeSingle();
  return error === null && data !== null ? guestDb : null;
}

async function duplicateExists(
  supabase: TypedSupabaseClient,
  eventId: string,
  normalized: string,
  excludedGuestId: string | null,
): Promise<boolean> {
  let query = supabase
    .from('guests')
    .select('id')
    .eq('event_id', eventId)
    .eq('phone_normalized', normalized)
    .eq('is_active', true);
  if (excludedGuestId !== null) query = query.neq('id', excludedGuestId);
  const { data } = await query.maybeSingle();
  return data !== null;
}

export async function saveGuestAction(formData: FormData): Promise<void> {
  const eventId = optional(formData.get('eventId'));
  const guestId = optional(formData.get('guestId'));
  const fullName = optional(formData.get('fullName'));
  const phone = optional(formData.get('phone'));
  const count = partySize(formData.get('partySize'));
  if (eventId === null) throw new Error('Invalid guest request');
  if (fullName === null || phone === null || count === null) {
    redirect(eventPath(eventId, { error: 'guest-fields' }));
  }

  const supabase = await requireOwnedEvent(eventId);
  if (supabase === null) redirect('/dashboard');

  let normalized: string;
  try {
    normalized = normalizeIsraeliPhone(phone);
  } catch (error) {
    if (error instanceof PhoneNormalizationError) {
      redirect(eventPath(eventId, { error: 'guest-phone' }));
    }
    throw error;
  }

  if (await duplicateExists(supabase, eventId, normalized, guestId)) {
    redirect(eventPath(eventId, { error: 'guest-duplicate' }));
  }

  const values: GuestWrite = {
    full_name: fullName.slice(0, 200),
    phone: phone.slice(0, 40),
    phone_normalized: normalized,
    email: optional(formData.get('email'))?.slice(0, 320) ?? null,
    party_size: count,
    table_name: optional(formData.get('tableName'))?.slice(0, 100) ?? null,
    seat_number: optional(formData.get('seatNumber'))?.slice(0, 50) ?? null,
    notes: optional(formData.get('notes'))?.slice(0, 1000) ?? null,
    is_active: true,
    token_revoked_at: null,
  };

  if (guestId === null) {
    const { error } = await supabase.from('guests').insert({
      event_id: eventId,
      full_name: values.full_name ?? '',
      phone: values.phone ?? '',
      phone_normalized: values.phone_normalized ?? '',
      email: values.email,
      party_size: values.party_size ?? 1,
      table_name: values.table_name,
      seat_number: values.seat_number,
      notes: values.notes,
      import_source: 'manual',
      is_active: true,
    });
    if (error) redirect(eventPath(eventId, { error: 'guest-save' }));
  } else {
    const { data, error } = await supabase
      .from('guests')
      .update(values)
      .eq('event_id', eventId)
      .eq('id', guestId)
      .select('id');
    if (error || data === null || data.length === 0) {
      redirect(eventPath(eventId, { error: 'guest-save' }));
    }
  }

  revalidatePath(`/dashboard/events/${eventId}`);
  revalidatePath(`/dashboard/events/${eventId}/guests`);
  revalidatePath(`/dashboard/events/${eventId}/tools`);
  redirect(eventPath(eventId, { saved: guestId === null ? 'guest-added' : 'guest-updated' }));
}

export async function deleteGuestAction(formData: FormData): Promise<void> {
  const eventId = optional(formData.get('eventId'));
  const guestId = optional(formData.get('guestId'));
  if (eventId === null || guestId === null) throw new Error('Invalid guest deletion');

  const supabase = await requireOwnedEvent(eventId);
  if (supabase === null) redirect('/dashboard');
  const { data, error } = await supabase
    .from('guests')
    .update({ is_active: false, token_revoked_at: new Date().toISOString() })
    .eq('event_id', eventId)
    .eq('id', guestId)
    .select('id');
  if (error || data === null || data.length === 0) {
    redirect(eventPath(eventId, { error: 'guest-delete' }));
  }

  revalidatePath(`/dashboard/events/${eventId}`);
  revalidatePath(`/dashboard/events/${eventId}/guests`);
  revalidatePath(`/dashboard/events/${eventId}/tools`);
  redirect(eventPath(eventId, { saved: 'guest-deleted' }));
}

interface ImportedContact {
  readonly name: string;
  readonly phone: string;
}

function parsePastedContacts(value: string): ImportedContact[] {
  const rows: ImportedContact[] = [];
  for (const line of value.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (trimmed === '') continue;
    const parts = trimmed.split(/[;,\t]/).map((part) => part.trim());
    if (parts.length < 2) continue;
    rows.push({ name: parts[0] ?? '', phone: parts[1] ?? '' });
  }
  return rows;
}

function parseSelectedContacts(value: string): ImportedContact[] {
  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    const rows: ImportedContact[] = [];
    for (const item of parsed) {
      if (typeof item !== 'object' || item === null) continue;
      const name = 'name' in item && typeof item.name === 'string' ? item.name.trim() : '';
      const phone = 'phone' in item && typeof item.phone === 'string' ? item.phone.trim() : '';
      if (name !== '' && phone !== '') rows.push({ name, phone });
    }
    return rows;
  } catch {
    return [];
  }
}

async function upsertContacts(
  supabase: TypedSupabaseClient,
  eventId: string,
  contacts: readonly ImportedContact[],
  source: string,
): Promise<{ saved: number; invalid: number }> {
  const unique = new Map<string, GuestInsert>();
  let invalid = 0;
  for (const contact of contacts) {
    try {
      const normalized = normalizeIsraeliPhone(contact.phone);
      unique.set(normalized, {
        event_id: eventId,
        full_name: contact.name.slice(0, 200),
        phone: contact.phone.slice(0, 40),
        phone_normalized: normalized,
        party_size: 1,
        import_source: source,
        is_active: true,
      });
    } catch (error) {
      if (error instanceof PhoneNormalizationError) invalid += 1;
      else throw error;
    }
  }
  if (unique.size === 0) return { saved: 0, invalid };

  const { error } = await supabase.from('guests').upsert([...unique.values()], {
    onConflict: 'event_id,phone_normalized',
    ignoreDuplicates: false,
  });
  if (error) throw new Error(`Guest contact import failed: ${error.code}`);
  return { saved: unique.size, invalid };
}

export async function importPhoneContactsAction(formData: FormData): Promise<void> {
  const eventId = optional(formData.get('eventId'));
  if (eventId === null) throw new Error('Invalid contact import');
  const supabase = await requireOwnedEvent(eventId);
  if (supabase === null) redirect('/dashboard');

  const selected = parseSelectedContacts(optional(formData.get('contactsJson')) ?? '');
  const pasted = parsePastedContacts(optional(formData.get('pastedContacts')) ?? '');
  const contacts = selected.length > 0 ? selected : pasted;
  if (contacts.length === 0) redirect(eventPath(eventId, { error: 'contacts-empty' }));

  try {
    const result = await upsertContacts(
      supabase,
      eventId,
      contacts,
      selected.length > 0 ? 'phone_contacts' : 'pasted_contacts',
    );
    if (result.saved === 0) redirect(eventPath(eventId, { error: 'contacts-invalid' }));
    revalidatePath(`/dashboard/events/${eventId}`);
    revalidatePath(`/dashboard/events/${eventId}/guests`);
    revalidatePath(`/dashboard/events/${eventId}/tools`);
    redirect(eventPath(eventId, { saved: 'contacts', count: String(result.saved) }));
  } catch {
    redirect(eventPath(eventId, { error: 'contacts-save' }));
  }
}

export async function importGuestFileAction(formData: FormData): Promise<void> {
  const eventId = optional(formData.get('eventId'));
  if (eventId === null) throw new Error('Invalid guest file import');
  const supabase = await requireOwnedEvent(eventId);
  if (supabase === null) redirect('/dashboard');

  const file = formData.get('guestFile');
  if (!(file instanceof File) || file.size === 0) {
    redirect(eventPath(eventId, { error: 'file-empty' }));
  }
  if (file.size > 5_000_000) redirect(eventPath(eventId, { error: 'file-large' }));

  try {
    const parsed = importGuestsFromFile(new Uint8Array(await file.arrayBuffer()), file.name);
    const rows = parsed.rows.map((guest) => ({ name: guest.fullName, phone: guest.phone }));
    const result = await upsertContacts(supabase, eventId, rows, parsed.source);
    if (result.saved === 0) redirect(eventPath(eventId, { error: 'contacts-invalid' }));
    revalidatePath(`/dashboard/events/${eventId}`);
    revalidatePath(`/dashboard/events/${eventId}/guests`);
    revalidatePath(`/dashboard/events/${eventId}/tools`);
    redirect(eventPath(eventId, { saved: 'file', count: String(result.saved) }));
  } catch (error) {
    if (error instanceof GuestImportError) {
      redirect(eventPath(eventId, { error: 'file-format' }));
    }
    redirect(eventPath(eventId, { error: 'contacts-save' }));
  }
}
