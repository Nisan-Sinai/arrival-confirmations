'use server';

import { revalidatePath } from 'next/cache';

import { defaultLocale, isLocale, localePath, type Locale } from '@/lib/i18n';
import { createUserClient } from '@/lib/server/supabase';

export interface ManageRsvpState {
  readonly status: 'idle' | 'saved' | 'error';
  readonly message: string;
}

const ATTENDANCE = new Set(['attending', 'not_attending', 'maybe']);

const COPY = {
  he: {
    failed: 'הפעולה נכשלה. נסו שוב.',
    invalidStatus: 'סטטוס לא תקין.',
    saveFailed: 'השמירה נכשלה. נסו שוב.',
    notFound: 'הרשומה לא נמצאה. רעננו את הדף.',
    saved: 'העדכון נשמר.',
  },
  en: {
    failed: 'The action failed. Please try again.',
    invalidStatus: 'Invalid status.',
    saveFailed: 'We could not save the change. Please try again.',
    notFound: 'The RSVP was not found. Refresh the page.',
    saved: 'The update was saved.',
  },
} as const;

function localeOf(formData: FormData): Locale {
  const value = formData.get('locale');
  return typeof value === 'string' && isLocale(value) ? value : defaultLocale;
}

function toCount(value: FormDataEntryValue | null): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0 || parsed > 30) return 0;
  return parsed;
}

export async function updateRsvpAction(
  _previous: ManageRsvpState,
  formData: FormData,
): Promise<ManageRsvpState> {
  const locale = localeOf(formData);
  const copy = COPY[locale];
  const rsvpId = formData.get('rsvpId');
  const eventId = formData.get('eventId');
  const status = formData.get('attendanceStatus');

  if (typeof rsvpId !== 'string' || typeof eventId !== 'string' || typeof status !== 'string') {
    return { status: 'error', message: copy.failed };
  }
  if (!ATTENDANCE.has(status)) return { status: 'error', message: copy.invalidStatus };

  const adults = toCount(formData.get('adultsCount'));
  const children = toCount(formData.get('childrenCount'));
  const babies = toCount(formData.get('babiesCount'));
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

  if (error) return { status: 'error', message: copy.saveFailed };
  if (updated === null || updated.length === 0) {
    return { status: 'error', message: copy.notFound };
  }

  revalidatePath(localePath(locale, `/dashboard/events/${eventId}`));
  return { status: 'saved', message: copy.saved };
}

export async function deleteRsvpAction(formData: FormData): Promise<void> {
  const locale = localeOf(formData);
  const rsvpId = formData.get('rsvpId');
  const eventId = formData.get('eventId');
  if (typeof rsvpId !== 'string' || typeof eventId !== 'string') return;

  const supabase = await createUserClient();
  await supabase.from('rsvps').delete().eq('id', rsvpId);
  revalidatePath(localePath(locale, `/dashboard/events/${eventId}`));
}
