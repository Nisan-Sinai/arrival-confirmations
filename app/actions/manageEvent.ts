'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { isEventType } from '@/config/eventTypes';
import { createUserClient } from '@/lib/server/supabase';
import { generateRawToken } from '@/lib/server/tokens';
import type { Database } from '@/types/database.types';

type EventWrite = Database['public']['Tables']['events']['Update'];

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
  /**
   * The parsed row, echoed back on failure so the form redraws with what the host
   * typed. React resets an uncontrolled form once its action resolves, so without
   * this a missing venue name emptied the date, the times, the map links and the
   * invitation note along with it.
   */
  readonly values?: EventWrite;
}

/** Trimmed, or null when the field was left empty. */
function optional(value: FormDataEntryValue | null): string | null {
  const text = typeof value === 'string' ? value.trim() : '';
  return text === '' ? null : text;
}

/**
 * A positive whole number, or null when the host left it blank.
 *
 * Null and zero are different answers here: null is "I did not say", which the
 * dashboard renders as no percentage at all, while zero would be a denominator that
 * cannot divide. Anything unparseable becomes null rather than an error — this field
 * is optional, and refusing to save an event over a typo in it would be absurd.
 */
function optionalCount(value: FormDataEntryValue | null): number | null {
  const text = optional(value);
  if (text === null) return null;
  const parsed = Number(text);
  return Number.isInteger(parsed) && parsed > 0 && parsed <= 5000 ? parsed : null;
}

/** A URL we are willing to put behind a button a guest will tap. */
function safeUrl(value: FormDataEntryValue | null): string | null {
  const text = optional(value);
  // Only https. A javascript: or data: URL here would be an XSS delivered by the
  // host's own invitation, and the database CHECK enforces the same rule.
  return text !== null && /^https:\/\//.test(text) ? text : null;
}

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
      gift_url: safeUrl(formData.get('giftUrl')),
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

/**
 * Sets how many invitations the host sent, from the dashboard tile itself (§8.1).
 *
 * Separate from `updateEventAction` rather than reusing it, because that one parses the
 * whole event and would blank every field this form does not carry. A one-number edit
 * needs a one-number write.
 *
 * Authorisation stays where it belongs: the statement runs through the host's own
 * session, so `events_owner_manage` decides what exists. The affected-row check is what
 * turns a policy refusal into something visible — an UPDATE the policy rejects matches
 * nothing and returns no error at all.
 */
export async function updateExpectedGuestsAction(
  _previous: ExpectedGuestsState,
  formData: FormData,
): Promise<ExpectedGuestsState> {
  const eventId = formData.get('eventId');
  if (typeof eventId !== 'string') {
    return { status: 'error', message: 'הפעולה נכשלה.' };
  }

  const raw = optional(formData.get('expectedGuests'));
  const expected = optionalCount(formData.get('expectedGuests'));

  // Clearing the field is a legitimate answer — "I do not know" — and puts the tile
  // back to showing no percentage. A non-empty value that parses to nothing is a typo.
  if (raw !== null && expected === null) {
    return { status: 'error', message: 'יש להזין מספר שלם בין 1 ל-5000.' };
  }

  const supabase = await createUserClient();
  const { data: updated, error } = await supabase
    .from('events')
    .update({ expected_guests: expected })
    .eq('id', eventId)
    .select('id');

  if (error) return { status: 'error', message: 'השמירה נכשלה. נסו שוב.' };
  if (updated === null || updated.length === 0) {
    return { status: 'error', message: 'האירוע לא נמצא, או שאין לכם הרשאה לערוך אותו.' };
  }

  revalidatePath(`/dashboard/events/${eventId}`);
  return { status: 'saved', message: 'נשמר.' };
}

export async function createEventAction(
  _previous: EventFormState,
  formData: FormData,
): Promise<EventFormState> {
  const { values, errors } = parseEventForm(formData);
  if (Object.keys(errors).length > 0) {
    return { status: 'error', message: '', fieldErrors: errors, values };
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
    return { status: 'error', message: 'היצירה נכשלה. נסו שוב.', fieldErrors: {}, values };
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
    return { status: 'error', message: '', fieldErrors: errors, values };
  }

  const supabase = await createUserClient();

  /**
   * `.select('id')` is not decoration. An UPDATE filtered by an id the policy does not
   * admit matches zero rows and returns no error at all — so the previous version
   * redirected to the event page announcing a save that never happened. Asking for the
   * affected rows back turns "the policy refused this" into something this function
   * can actually see.
   */
  const { data: updated, error } = await supabase
    .from('events')
    .update(values)
    .eq('id', eventId)
    .select('id');

  if (error) {
    return { status: 'error', message: 'השמירה נכשלה. נסו שוב.', fieldErrors: {}, values };
  }
  if (updated === null || updated.length === 0) {
    // Either the event was deleted from another tab, or it belongs to somebody else.
    // One message for both: which of the two it is, is not the caller's business.
    return {
      status: 'error',
      message: 'האירוע לא נמצא, או שאין לכם הרשאה לערוך אותו.',
      fieldErrors: {},
      values,
    };
  }

  // The invitation is cached for a minute; a host who just corrected the venue
  // should not have to wait it out.
  revalidatePath('/dashboard');
  revalidatePath(`/dashboard/events/${eventId}`);
  revalidatePath('/e', 'layout');
  redirect(`/dashboard/events/${eventId}`);
}
