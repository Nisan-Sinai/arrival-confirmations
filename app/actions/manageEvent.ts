'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { getAppCopy } from '@/config/appCopy';
import { isEventType } from '@/config/eventTypes';
import { defaultLocale, isLocale, localePath, type Locale } from '@/lib/i18n';
import { createUserClient } from '@/lib/server/supabase';
import { generateRawToken } from '@/lib/server/tokens';
import type { Database } from '@/types/database.types';

type EventWrite = Database['public']['Tables']['events']['Update'];

export interface EventFormState {
  readonly status: 'idle' | 'error';
  readonly message: string;
  readonly fieldErrors: Record<string, string>;
  readonly values?: EventWrite;
}

function localeOf(formData: FormData): Locale {
  const value = formData.get('locale');
  return typeof value === 'string' && isLocale(value) ? value : defaultLocale;
}

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

function safeUrl(value: FormDataEntryValue | null): string | null {
  const text = optional(value);
  return text !== null && /^https:\/\//.test(text) ? text : null;
}

interface ParsedEvent {
  readonly values: EventWrite;
  readonly errors: Record<string, string>;
}

function parseEventForm(formData: FormData, locale: Locale): ParsedEvent {
  const copy = getAppCopy(locale).eventForm;
  const errors: Record<string, string> = {};
  const title = optional(formData.get('title'));
  const hostsNames = optional(formData.get('hostsNames'));
  const honoree = optional(formData.get('honoreeDisplayName'));
  const eventDate = optional(formData.get('eventDate'));
  const venueName = optional(formData.get('venueName'));
  const address = optional(formData.get('address'));
  const eventType = formData.get('eventType');

  if (title === null) errors['title'] = copy.required;
  if (hostsNames === null) errors['hostsNames'] = copy.required;
  if (honoree === null) errors['honoreeDisplayName'] = copy.required;
  if (venueName === null) errors['venueName'] = copy.required;
  if (address === null) errors['address'] = copy.required;
  if (eventDate === null || !/^\d{4}-\d{2}-\d{2}$/.test(eventDate)) {
    errors['eventDate'] = copy.chooseDate;
  }
  if (!isEventType(eventType)) errors['eventType'] = copy.chooseType;

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
      expected_guests: optionalCount(formData.get('expectedGuests')),
      is_active: formData.get('isActive') === 'on',
    },
    errors,
  };
}

export interface ExpectedGuestsState {
  readonly status: 'idle' | 'saved' | 'error';
  readonly message: string;
}

export async function updateExpectedGuestsAction(
  _previous: ExpectedGuestsState,
  formData: FormData,
): Promise<ExpectedGuestsState> {
  const locale = localeOf(formData);
  const copy = getAppCopy(locale).eventForm;
  const eventId = formData.get('eventId');
  if (typeof eventId !== 'string') return { status: 'error', message: copy.actionFailed };

  const raw = optional(formData.get('expectedGuests'));
  const expected = optionalCount(formData.get('expectedGuests'));
  if (raw !== null && expected === null) {
    return { status: 'error', message: copy.expectedInvalid };
  }

  const supabase = await createUserClient();
  const { data: updated, error } = await supabase
    .from('events')
    .update({ expected_guests: expected })
    .eq('id', eventId)
    .select('id');

  if (error) return { status: 'error', message: copy.saveFailed };
  if (updated === null || updated.length === 0) {
    return { status: 'error', message: copy.notFoundOrForbidden };
  }

  revalidatePath(localePath(locale, `/dashboard/events/${eventId}`));
  return { status: 'saved', message: copy.saved };
}

export async function createEventAction(
  _previous: EventFormState,
  formData: FormData,
): Promise<EventFormState> {
  const locale = localeOf(formData);
  const copy = getAppCopy(locale).eventForm;
  const { values, errors } = parseEventForm(formData, locale);
  if (Object.keys(errors).length > 0) {
    return { status: 'error', message: '', fieldErrors: errors, values };
  }

  const supabase = await createUserClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user === null) redirect(localePath(locale, '/login'));

  const { data, error } = await supabase
    .from('events')
    .insert({
      ...(values as Database['public']['Tables']['events']['Insert']),
      owner_user_id: user.id,
      public_id: generateRawToken().slice(0, 12),
    })
    .select('id')
    .single();

  if (error || data === null) {
    return { status: 'error', message: copy.createFailed, fieldErrors: {}, values };
  }

  revalidatePath(localePath(locale, '/dashboard'));
  redirect(localePath(locale, `/dashboard/events/${data.id}`));
}

export async function updateEventAction(
  _previous: EventFormState,
  formData: FormData,
): Promise<EventFormState> {
  const locale = localeOf(formData);
  const copy = getAppCopy(locale).eventForm;
  const eventId = formData.get('eventId');
  if (typeof eventId !== 'string') {
    return { status: 'error', message: copy.actionFailed, fieldErrors: {} };
  }

  const { values, errors } = parseEventForm(formData, locale);
  if (Object.keys(errors).length > 0) {
    return { status: 'error', message: '', fieldErrors: errors, values };
  }

  const supabase = await createUserClient();
  const { data: updated, error } = await supabase
    .from('events')
    .update(values)
    .eq('id', eventId)
    .select('id');

  if (error) return { status: 'error', message: copy.saveFailed, fieldErrors: {}, values };
  if (updated === null || updated.length === 0) {
    return { status: 'error', message: copy.notFoundOrForbidden, fieldErrors: {}, values };
  }

  revalidatePath(localePath(locale, '/dashboard'));
  revalidatePath(localePath(locale, `/dashboard/events/${eventId}`));
  revalidatePath(localePath(locale, '/e'), 'layout');
  redirect(localePath(locale, `/dashboard/events/${eventId}`));
}
