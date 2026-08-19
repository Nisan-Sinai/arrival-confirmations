'use server';

import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';

import { canAcceptRsvp, getEventLicense } from '@/app/_lib/eventLicenses';
import { isMonetizedEvent } from '@/app/_lib/plans';
import { getAppCopy } from '@/config/appCopy';
import { getDictionary } from '@/config/dictionary';
import { appConfig } from '@/config/event.config';
import { defaultLocale, isLocale, localePath, type Locale } from '@/lib/i18n';
import { resolveClientIpHash } from '@/lib/server/ip';
import { createPrivilegedClient } from '@/lib/server/supabase';
import { hashIdentity, issueToken, TOKEN_PURPOSES } from '@/lib/server/tokens';
import { parseRsvpSubmission, toFieldErrors } from '@/schemas/rsvp';

export interface RsvpFormValues {
  readonly fullName: string;
  readonly phone: string;
  readonly attendanceStatus: string;
  readonly adultsCount: string;
  readonly childrenCount: string;
  readonly babiesCount: string;
  readonly familySide: string;
  readonly dietaryRequirements: string;
  readonly notes: string;
}

export interface RsvpFormState {
  readonly status: 'idle' | 'success' | 'error';
  readonly message: string;
  readonly fieldErrors: Record<string, string>;
  readonly values?: RsvpFormValues;
}

const RATE_LIMIT_PER_WINDOW = 5;
const RATE_LIMIT_WINDOW_SECONDS = 300;

const raw = (formData: FormData, key: string): string => {
  const value = formData.get(key);
  return typeof value === 'string' ? value : '';
};

function localeOf(formData: FormData): Locale {
  const value = formData.get('locale');
  return typeof value === 'string' && isLocale(value) ? value : defaultLocale;
}

function submittedValues(formData: FormData): RsvpFormValues {
  return {
    fullName: raw(formData, 'fullName'),
    phone: raw(formData, 'phone'),
    attendanceStatus: raw(formData, 'attendanceStatus'),
    adultsCount: raw(formData, 'adultsCount'),
    childrenCount: raw(formData, 'childrenCount'),
    babiesCount: raw(formData, 'babiesCount'),
    familySide: raw(formData, 'familySide'),
    dietaryRequirements: raw(formData, 'dietaryRequirements'),
    notes: raw(formData, 'notes'),
  };
}

function successMessage(status: string, locale: Locale): string {
  const messages = getDictionary(locale).rsvp;
  if (status === 'attending') return messages.successAttending;
  if (status === 'not_attending') return messages.successNotAttending;
  return messages.successMaybe;
}

export async function submitRsvpAction(
  _previous: RsvpFormState,
  formData: FormData,
): Promise<RsvpFormState> {
  const locale = localeOf(formData);
  const dictionary = getDictionary(locale);
  const copy = getAppCopy(locale);
  const values = submittedValues(formData);
  const eventId = formData.get('eventId');
  if (typeof eventId !== 'string' || eventId === '') {
    return { status: 'error', message: dictionary.errors.genericBody, fieldErrors: {}, values };
  }

  const parsed = parseRsvpSubmission(
    {
      fullName: formData.get('fullName'),
      phone: formData.get('phone'),
      attendanceStatus: formData.get('attendanceStatus'),
      adultsCount: formData.get('adultsCount'),
      childrenCount: formData.get('childrenCount'),
      babiesCount: formData.get('babiesCount'),
      familySide: formData.get('familySide'),
      dietaryRequirements: formData.get('dietaryRequirements'),
      notes: formData.get('notes'),
      consent: formData.get('consent') === 'on',
      company: formData.get('company') ?? '',
    },
    locale,
  );

  if (!parsed.success) {
    return { status: 'error', message: '', fieldErrors: toFieldErrors(parsed.error), values };
  }

  const submission = parsed.data;
  const supabase = createPrivilegedClient();
  const { data: event, error: eventError } = await supabase
    .from('events')
    .select('id, created_at')
    .eq('id', eventId)
    .eq('is_active', true)
    .maybeSingle();
  if (eventError || event === null) {
    return { status: 'error', message: dictionary.errors.genericBody, fieldErrors: {}, values };
  }

  const fallback = isMonetizedEvent(event.created_at) ? 'trial' : 'legacy';
  const [license, countResult, existingResult] = await Promise.all([
    getEventLicense(event.id, fallback),
    supabase.from('rsvps').select('id', { count: 'exact', head: true }).eq('event_id', event.id),
    supabase
      .from('rsvps')
      .select('id')
      .eq('event_id', event.id)
      .eq('phone_normalized', submission.phone)
      .maybeSingle(),
  ]);

  if (countResult.error || existingResult.error) {
    console.error('event plan check failed', {
      countCode: countResult.error?.code,
      existingCode: existingResult.error?.code,
    });
    return { status: 'error', message: dictionary.rsvp.unknownError, fieldErrors: {}, values };
  }

  if (!canAcceptRsvp(license, countResult.count ?? 0, existingResult.data !== null)) {
    return { status: 'error', message: copy.rsvp.limitReached, fieldErrors: {}, values };
  }

  const { hash: ipHash } = resolveClientIpHash(await headers());
  const bucket = `rsvp:${ipHash}:${hashIdentity(submission.phone, TOKEN_PURPOSES.rateLimit)}`;
  const { data: limit } = await supabase.rpc('consume_rate_limit', {
    p_bucket_key: bucket,
    p_limit: RATE_LIMIT_PER_WINDOW,
    p_window_seconds: RATE_LIMIT_WINDOW_SECONDS,
  });
  if (limit?.[0]?.allowed === false) {
    return { status: 'error', message: dictionary.rsvp.rateLimited, fieldErrors: {}, values };
  }

  const fingerprint = hashIdentity(
    JSON.stringify([
      submission.phone,
      submission.attendanceStatus,
      submission.adultsCount,
      submission.childrenCount,
      submission.babiesCount,
    ]),
    TOKEN_PURPOSES.idempotency,
  );
  const idempotencyKeyHash = hashIdentity(
    `${event.id}:${submission.phone}:${fingerprint}`,
    TOKEN_PURPOSES.idempotency,
  );
  const updateToken = issueToken(TOKEN_PURPOSES.update);

  const { data: result, error } = await supabase.rpc('submit_rsvp', {
    p_event_id: event.id,
    p_guest_id: null,
    p_full_name: submission.fullName,
    p_phone: submission.phone,
    p_phone_normalized: submission.phone,
    p_family_side: submission.familySide,
    p_attendance_status: submission.attendanceStatus,
    p_adults: submission.adultsCount,
    p_children: submission.childrenCount,
    p_babies: submission.babiesCount,
    p_dietary: submission.dietaryRequirements,
    p_notes: submission.notes,
    p_consent: submission.consent,
    p_source: 'public_form',
    p_idempotency_key_hash: idempotencyKeyHash,
    p_request_fingerprint: fingerprint,
    p_update_token_hash: null,
    p_new_update_token_hash: updateToken.hash,
    p_update_token_ttl_days: appConfig.updateTokenTtlDays,
    p_idempotency_ttl_hours: appConfig.idempotencyTtlHours,
  });

  if (error) {
    console.error('submit_rsvp failed', { code: error.code });
    return { status: 'error', message: dictionary.rsvp.unknownError, fieldErrors: {}, values };
  }

  const outcome = (result as { outcome?: string } | null)?.outcome;
  if (outcome === 'idempotency_conflict' || outcome === 'event_unavailable') {
    return { status: 'error', message: dictionary.rsvp.unknownError, fieldErrors: {}, values };
  }

  revalidatePath(localePath(locale, '/e'), 'layout');
  return {
    status: 'success',
    message: successMessage(submission.attendanceStatus, locale),
    fieldErrors: {},
  };
}
