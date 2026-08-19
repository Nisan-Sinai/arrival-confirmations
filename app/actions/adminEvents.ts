'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { requirePlatformOwner } from '@/app/_lib/platformAdmin';
import { isEventType } from '@/config/eventTypes';
import { defaultLocale, isLocale, localePath, type Locale } from '@/lib/i18n';
import { createPrivilegedClient } from '@/lib/server/supabase';

export interface AdminEventFormState {
  readonly status: 'idle' | 'error';
  readonly message: string;
  readonly fieldErrors: Record<string, string>;
}

function optional(value: FormDataEntryValue | null): string | null {
  const text = typeof value === 'string' ? value.trim() : '';
  return text === '' ? null : text;
}

function localeOf(formData: FormData): Locale {
  const value = formData.get('locale');
  return typeof value === 'string' && isLocale(value) ? value : defaultLocale;
}

const COPY = {
  he: {
    denied: 'אין הרשאה לעדכן את האירוע.',
    title: 'יש להזין כותרת לאירוע.',
    hosts: 'יש להזין שמות מארחים.',
    honoree: 'יש להזין שם לחוגג/ת.',
    date: 'יש לבחור תאריך תקין.',
    type: 'יש לבחור סוג אירוע תקין.',
    venue: 'יש להזין מקום.',
    address: 'יש להזין כתובת.',
    saveFailed: 'שמירת האירוע נכשלה. נסו שוב.',
    notFound: 'האירוע לא נמצא.',
  },
  en: {
    denied: 'You do not have permission to update this event.',
    title: 'Enter an event title.',
    hosts: 'Enter the host names.',
    honoree: 'Enter the celebrant name.',
    date: 'Choose a valid date.',
    type: 'Choose a valid event type.',
    venue: 'Enter a venue.',
    address: 'Enter an address.',
    saveFailed: 'We could not save the event. Please try again.',
    notFound: 'The event was not found.',
  },
} as const;

export async function adminUpdateEventAction(
  _previous: AdminEventFormState,
  formData: FormData,
): Promise<AdminEventFormState> {
  const locale = localeOf(formData);
  const copy = COPY[locale];
  const access = await requirePlatformOwner();
  if (access.user === null) redirect(localePath(locale, '/login'));
  if (!access.allowed) {
    return { status: 'error', message: copy.denied, fieldErrors: {} };
  }

  const eventId = optional(formData.get('eventId'));
  if (eventId === null) return { status: 'error', message: copy.notFound, fieldErrors: {} };

  const title = optional(formData.get('title'));
  const hostsNames = optional(formData.get('hostsNames'));
  const honoree = optional(formData.get('honoreeDisplayName'));
  const eventDate = optional(formData.get('eventDate'));
  const venueName = optional(formData.get('venueName'));
  const address = optional(formData.get('address'));
  const eventType = formData.get('eventType');
  const fieldErrors: Record<string, string> = {};

  if (title === null) fieldErrors['title'] = copy.title;
  if (hostsNames === null) fieldErrors['hostsNames'] = copy.hosts;
  if (honoree === null) fieldErrors['honoreeDisplayName'] = copy.honoree;
  if (eventDate === null || !/^\d{4}-\d{2}-\d{2}$/.test(eventDate)) fieldErrors['eventDate'] = copy.date;
  if (!isEventType(eventType)) fieldErrors['eventType'] = copy.type;
  if (venueName === null) fieldErrors['venueName'] = copy.venue;
  if (address === null) fieldErrors['address'] = copy.address;
  if (Object.keys(fieldErrors).length > 0) {
    return { status: 'error', message: '', fieldErrors };
  }

  const db = createPrivilegedClient();
  const { data, error } = await db
    .from('events')
    .update({
      title: title!,
      hosts_names: hostsNames!,
      honoree_display_name: honoree!,
      event_date: eventDate!,
      event_type: eventType as NonNullable<typeof eventType> & string,
      venue_name: venueName!,
      address: address!,
      ceremony_time: optional(formData.get('ceremonyTime')),
      reception_time: optional(formData.get('receptionTime')),
      contact_phone: optional(formData.get('contactPhone')),
      description: optional(formData.get('description')),
      side_a_label: optional(formData.get('sideALabel')),
      side_b_label: optional(formData.get('sideBLabel')),
      waze_url: optional(formData.get('wazeUrl')),
      google_maps_url: optional(formData.get('googleMapsUrl')),
      expected_guests: (() => {
        const value = optional(formData.get('expectedGuests'));
        if (value === null) return null;
        const parsed = Number(value);
        return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
      })(),
      is_active: formData.get('isActive') === 'on',
    })
    .eq('id', eventId)
    .select('id');

  if (error) return { status: 'error', message: copy.saveFailed, fieldErrors: {} };
  if (data === null || data.length === 0) {
    return { status: 'error', message: copy.notFound, fieldErrors: {} };
  }

  revalidatePath(localePath(locale, '/admin/events'));
  revalidatePath(localePath(locale, `/admin/events/${eventId}`));
  revalidatePath(localePath(locale, `/dashboard/events/${eventId}`));
  revalidatePath(localePath(locale, '/e'), 'layout');
  redirect(localePath(locale, `/admin/events/${eventId}`));
}
