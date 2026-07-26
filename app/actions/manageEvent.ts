'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { isEventType } from '@/config/eventTypes';
import { createUserClient } from '@/lib/server/supabase';
import { generateRawToken } from '@/lib/server/tokens';
import type { Database } from '@/types/database.types';

/**
 * Creating and editing an event (§8).
 *
 * Authorisation is the policy's job, not this file's. Every statement runs through
 * the host's own session, so `events_owner_manage` decides what exists and what may
 * be written — an id belonging to another account matches no row, and the WITH CHECK
 * clause refuses an insert that names somebody else as owner. That holds even if the
 * code below is wrong, which a check written here would not.
 */

export interface EventFormState {
  readonly status: 'idle' | 'error';
  readonly message: string;
  readonly fieldErrors: Record<string, string>;
}

/** Trimmed, or null when the field was left empty. */
function optional(value: FormDataEntryValue | null): string | null {
  const text = typeof value === 'string' ? value.trim() : '';
  return text === '' ? null : text;
}

/** A URL we are willing to put behind a button a guest will tap. */
function safeUrl(value: FormDataEntryValue | null): string | null {
  const text = optional(value);
  // Only https. A javascript: or data: URL here would be an XSS delivered by the
  // host's own invitation, and the database CHECK enforces the same rule.
  return text !== null && /^https:\/\//.test(text) ? text : null;
}

type EventWrite = Database['public']['Tables']['events']['Update'];

interface ParsedEvent {
  // The generated row type rather than a loose record, so a column renamed in a
  // migration fails here at compile time instead of at runtime.
  readonly values: EventWrite;
  readonly errors: Record<string, string>;
}

function parseEventForm(formData: FormData): ParsedEvent {
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
      is_active: formData.get('isActive') === 'on',
    },
    errors,
  };
}

export async function createEventAction(
  _previous: EventFormState,
  formData: FormData,
): Promise<EventFormState> {
  const { values, errors } = parseEventForm(formData);
  if (Object.keys(errors).length > 0) {
    return { status: 'error', message: '', fieldErrors: errors };
  }

  const supabase = await createUserClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user === null) redirect('/login');

  const { data, error } = await supabase
    .from('events')
    .insert({
      ...(values as Database['public']['Tables']['events']['Insert']),
      owner_user_id: user.id,
      // 12 base64url characters from the same CSPRNG the invite tokens use — never
      // Math.random, and never derived from the title (§4.2).
      public_id: generateRawToken().slice(0, 12),
    })
    .select('id')
    .single();

  if (error || data === null) {
    return { status: 'error', message: 'היצירה נכשלה. נסו שוב.', fieldErrors: {} };
  }

  revalidatePath('/dashboard');
  redirect(`/dashboard/events/${data.id}`);
}

export async function updateEventAction(
  _previous: EventFormState,
  formData: FormData,
): Promise<EventFormState> {
  const eventId = formData.get('eventId');
  if (typeof eventId !== 'string') {
    return { status: 'error', message: 'הפעולה נכשלה.', fieldErrors: {} };
  }

  const { values, errors } = parseEventForm(formData);
  if (Object.keys(errors).length > 0) {
    return { status: 'error', message: '', fieldErrors: errors };
  }

  const supabase = await createUserClient();
  const { error } = await supabase.from('events').update(values).eq('id', eventId);

  if (error) {
    return { status: 'error', message: 'השמירה נכשלה. נסו שוב.', fieldErrors: {} };
  }

  // The invitation is cached for a minute; a host who just corrected the venue
  // should not have to wait it out.
  revalidatePath('/dashboard');
  revalidatePath(`/dashboard/events/${eventId}`);
  revalidatePath('/e', 'layout');
  redirect(`/dashboard/events/${eventId}`);
}
