'use server';

import { revalidatePath } from 'next/cache';

import { createUserClient } from '@/lib/server/supabase';

/**
 * Host-side edits to a reply (§8 actions).
 *
 * A guest says "we'll be four" on the phone the week before, or cancels, or a name
 * was typed wrong. The host has to be able to correct the list, and until now could
 * not: these two actions existed but nothing in the application called them — the
 * event page rendered a read-only table. They are reachable from the UI as of this
 * change.
 *
 * Authorisation is not re-implemented here. Every statement runs through the host's
 * own session, so the `rsvps_owner_manage` policy decides what exists — an id
 * belonging to somebody else's event simply matches no row. That is stronger than a
 * check in this file, because it holds even if this file is wrong.
 *
 * What *is* re-implemented is noticing when the policy said no. A write that matches
 * zero rows returns no error, so both functions ask for the affected rows back rather
 * than reporting a save that never happened.
 */

export interface ManageRsvpState {
  readonly status: 'idle' | 'saved' | 'error';
  readonly message: string;
}

const ATTENDANCE = new Set(['attending', 'not_attending', 'maybe']);

function toCount(value: FormDataEntryValue | null): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0 || parsed > 30) return 0;
  return parsed;
}

export async function updateRsvpAction(
  _previous: ManageRsvpState,
  formData: FormData,
): Promise<ManageRsvpState> {
  const rsvpId = formData.get('rsvpId');
  const eventId = formData.get('eventId');
  const status = formData.get('attendanceStatus');

  if (typeof rsvpId !== 'string' || typeof eventId !== 'string' || typeof status !== 'string') {
    return { status: 'error', message: 'הפעולה נכשלה. נסו שוב.' };
  }
  if (!ATTENDANCE.has(status)) {
    return { status: 'error', message: 'סטטוס לא תקין.' };
  }

  const adults = toCount(formData.get('adultsCount'));
  const children = toCount(formData.get('childrenCount'));
  const babies = toCount(formData.get('babiesCount'));

  // Mirrors rsvps_not_attending_has_no_seats: the constraint would reject this
  // anyway, but a rejected update reads as a server error rather than as the rule
  // it actually is.
  const zeroed = status === 'not_attending';

  const supabase = await createUserClient();
  const { data: updated, error } = await supabase
    .from('rsvps')
    .update({
      attendance_status: status as 'attending' | 'not_attending' | 'maybe',
      adults_count: zeroed ? 0 : adults,
      children_count: zeroed ? 0 : children,
      babies_count: zeroed ? 0 : babies,
    })
    .eq('id', rsvpId)
    .select('id');

  if (error) return { status: 'error', message: 'השמירה נכשלה. נסו שוב.' };
  if (updated === null || updated.length === 0) {
    return { status: 'error', message: 'הרשומה לא נמצאה. רעננו את הדף.' };
  }

  revalidatePath(`/dashboard/events/${eventId}`);
  return { status: 'saved', message: 'העדכון נשמר.' };
}

export async function deleteRsvpAction(formData: FormData): Promise<void> {
  const rsvpId = formData.get('rsvpId');
  const eventId = formData.get('eventId');
  if (typeof rsvpId !== 'string' || typeof eventId !== 'string') return;

  const supabase = await createUserClient();
  await supabase.from('rsvps').delete().eq('id', rsvpId);
  revalidatePath(`/dashboard/events/${eventId}`);
}
