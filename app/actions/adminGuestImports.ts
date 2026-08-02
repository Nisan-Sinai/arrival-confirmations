'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { assertPlatformOwner } from '@/app/_lib/platformAdmin';
import { normalizeIsraeliPhone, PhoneNormalizationError } from '@/lib/phone';
import { createPrivilegedClient } from '@/lib/server/supabase';
import type { Database } from '@/types/database.types';

interface ContactRow {
  readonly name: string;
  readonly phone: string;
}

function value(formData: FormData, key: string): string {
  const entry = formData.get(key);
  return typeof entry === 'string' ? entry.trim() : '';
}

function path(eventId: string, params: Record<string, string>): string {
  return `/admin/events/${eventId}?${new URLSearchParams(params).toString()}`;
}

function selectedContacts(raw: string): ContactRow[] {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.flatMap((item) => {
      if (typeof item !== 'object' || item === null) return [];
      const name = 'name' in item && typeof item.name === 'string' ? item.name.trim() : '';
      const phone = 'phone' in item && typeof item.phone === 'string' ? item.phone.trim() : '';
      return name === '' || phone === '' ? [] : [{ name, phone }];
    });
  } catch {
    return [];
  }
}

function pastedContacts(raw: string): ContactRow[] {
  return raw.split(/\r?\n/).flatMap((line) => {
    const parts = line.split(/[;,\t]/).map((part) => part.trim());
    const name = parts[0] ?? '';
    const phone = parts[1] ?? '';
    return name === '' || phone === '' ? [] : [{ name, phone }];
  });
}

export async function adminImportPhoneContactsAction(formData: FormData): Promise<void> {
  const admin = await assertPlatformOwner();
  const eventId = value(formData, 'eventId');
  if (eventId === '') throw new Error('Invalid event id');

  const privileged = createPrivilegedClient();
  const { data: event } = await privileged.from('events').select('id').eq('id', eventId).maybeSingle();
  if (event === null) throw new Error('Event not found');

  const selected = selectedContacts(value(formData, 'contactsJson'));
  const pasted = pastedContacts(value(formData, 'pastedContacts'));
  const contacts = selected.length > 0 ? selected : pasted;
  if (contacts.length === 0) redirect(path(eventId, { error: 'contacts-empty' }));

  const rows = new Map<string, Database['public']['Tables']['guests']['Insert']>();
  for (const contact of contacts) {
    try {
      const normalized = normalizeIsraeliPhone(contact.phone);
      rows.set(normalized, {
        event_id: eventId,
        full_name: contact.name.slice(0, 200),
        phone: contact.phone.slice(0, 40),
        phone_normalized: normalized,
        party_size: 1,
        import_source: selected.length > 0 ? 'admin_phone_contacts' : 'admin_pasted_contacts',
        is_active: true,
      });
    } catch (error) {
      if (!(error instanceof PhoneNormalizationError)) throw error;
    }
  }

  if (rows.size === 0) redirect(path(eventId, { error: 'contacts-invalid' }));
  const { error } = await privileged.from('guests').upsert([...rows.values()], {
    onConflict: 'event_id,phone_normalized',
    ignoreDuplicates: false,
  });
  if (error) redirect(path(eventId, { error: 'contacts-save' }));

  await privileged.from('audit_logs').insert({
    admin_user_id: admin.id,
    action: 'admin_guests_imported',
    entity_type: 'event',
    entity_id: eventId,
    metadata: { count: rows.size, source: selected.length > 0 ? 'phone' : 'paste' },
  });

  revalidatePath(`/admin/events/${eventId}`);
  revalidatePath(`/dashboard/events/${eventId}`);
  revalidatePath(`/dashboard/events/${eventId}/guests`);
  revalidatePath(`/dashboard/events/${eventId}/tools`);
  redirect(path(eventId, { saved: 'contacts', count: String(rows.size) }));
}
