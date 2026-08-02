'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { assertPlatformOwner } from '@/app/_lib/platformAdmin';
import { GuestImportError, importGuestsFromFile } from '@/lib/guestImport';
import { normalizeIsraeliPhone, PhoneNormalizationError } from '@/lib/phone';
import { createPrivilegedClient } from '@/lib/server/supabase';
import type { GuestInsert, GuestSupabaseClient } from '@/types/guestDatabase.types';

function value(formData: FormData, key: string): string {
  const entry = formData.get(key);
  return typeof entry === 'string' ? entry.trim() : '';
}

function path(eventId: string, params: Record<string, string>): string {
  return `/admin/events/${eventId}?${new URLSearchParams(params).toString()}`;
}

export async function adminImportGuestFileAction(formData: FormData): Promise<void> {
  const admin = await assertPlatformOwner();
  const eventId = value(formData, 'eventId');
  if (eventId === '') throw new Error('Invalid event id');

  const privileged = createPrivilegedClient() as unknown as GuestSupabaseClient;
  const { data: event } = await privileged
    .from('events')
    .select('id')
    .eq('id', eventId)
    .maybeSingle();
  if (event === null) throw new Error('Event not found');

  const file = formData.get('guestFile');
  if (!(file instanceof File) || file.size === 0) {
    redirect(path(eventId, { error: 'file-empty' }));
  }
  if (file.size > 5_000_000) redirect(path(eventId, { error: 'file-large' }));

  try {
    const parsed = importGuestsFromFile(new Uint8Array(await file.arrayBuffer()), file.name);
    const rows = new Map<string, GuestInsert>();
    for (const guest of parsed.rows) {
      try {
        const normalized = normalizeIsraeliPhone(guest.phone);
        rows.set(normalized, {
          event_id: eventId,
          full_name: guest.fullName.slice(0, 200),
          phone: guest.phone.slice(0, 40),
          phone_normalized: normalized,
          email: guest.email,
          family_side: guest.familySide,
          party_size: guest.partySize,
          table_name: guest.tableName,
          seat_number: guest.seatNumber,
          notes: guest.notes,
          import_source: `admin_${parsed.source}`,
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
      metadata: { count: rows.size, source: parsed.source },
    });

    revalidatePath(`/admin/events/${eventId}`);
    revalidatePath(`/dashboard/events/${eventId}`);
    revalidatePath(`/dashboard/events/${eventId}/guests`);
    revalidatePath(`/dashboard/events/${eventId}/tools`);
    redirect(path(eventId, { saved: 'file', count: String(rows.size) }));
  } catch (error) {
    if (error instanceof GuestImportError) {
      redirect(path(eventId, { error: 'file-format' }));
    }
    redirect(path(eventId, { error: 'contacts-save' }));
  }
}
