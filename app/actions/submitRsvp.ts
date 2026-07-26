'use server';

import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';

import { appConfig } from '@/config/event.config';
import { UI_MESSAGES } from '@/config/messages';
import { resolveClientIpHash } from '@/lib/server/ip';
import { createPrivilegedClient } from '@/lib/server/supabase';
import { hashIdentity, issueToken, TOKEN_PURPOSES } from '@/lib/server/tokens';
import { parseRsvpSubmission, toFieldErrors } from '@/schemas/rsvp';

/**
 * The Server Action behind the public RSVP form (§6.1, §6.2).
 *
 * It is a thin orchestrator on purpose. Everything that could go wrong in an
 * interesting way lives somewhere already tested: validation in `schemas/rsvp.ts`,
 * identity hashing in `lib/server/tokens.ts`, and the whole create-versus-update
 * decision inside `submit_rsvp`, where it is one transaction. This function's job is
 * to run §6.1's gate in the right order and to translate the result into Hebrew.
 */

export interface RsvpFormState {
  readonly status: 'idle' | 'success' | 'error';
  readonly message: string;
  readonly fieldErrors: Record<string, string>;
}

export const initialRsvpFormState: RsvpFormState = {
  status: 'idle',
  message: '',
  fieldErrors: {},
};

const RATE_LIMIT_PER_WINDOW = 5;
const RATE_LIMIT_WINDOW_SECONDS = 300;

/** Success copy depends on the answer — "we'll see you there" is wrong for a decline. */
function successMessage(status: string): string {
  if (status === 'attending') return UI_MESSAGES.rsvp.successAttending;
  if (status === 'not_attending') return UI_MESSAGES.rsvp.successNotAttending;
  return UI_MESSAGES.rsvp.successMaybe;
}

export async function submitRsvpAction(
  _previous: RsvpFormState,
  formData: FormData,
): Promise<RsvpFormState> {
  // §6.1 step 1: re-validate on the server. The client already ran this schema; that
  // run was a convenience and this one is the control.
  const parsed = parseRsvpSubmission({
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
  });

  if (!parsed.success) {
    return {
      status: 'error',
      message: '',
      fieldErrors: toFieldErrors(parsed.error),
    };
  }
  const submission = parsed.data;

  const supabase = createPrivilegedClient();

  const { data: event } = await supabase.rpc('get_public_event');
  if (event === null || event.id === null) {
    return { status: 'error', message: UI_MESSAGES.errors.genericBody, fieldErrors: {} };
  }

  // §6.1 step 2: distributed rate limit, keyed on the resolved IP *and* the phone, so
  // neither a single address nor a single number can be hammered independently.
  const { hash: ipHash } = resolveClientIpHash(await headers());
  const bucket = `rsvp:${ipHash}:${hashIdentity(submission.phone, TOKEN_PURPOSES.rateLimit)}`;

  const { data: limit } = await supabase.rpc('consume_rate_limit', {
    p_bucket_key: bucket,
    p_limit: RATE_LIMIT_PER_WINDOW,
    p_window_seconds: RATE_LIMIT_WINDOW_SECONDS,
  });

  if (limit?.[0]?.allowed === false) {
    return { status: 'error', message: UI_MESSAGES.rsvp.rateLimited, fieldErrors: {} };
  }

  /**
   * §6.3: the idempotency key. Derived from the submission rather than supplied by
   * the browser, because a double-clicked button sends the identical body twice and
   * that is exactly the case this has to collapse into one row. The fingerprint
   * covers the answer itself, so a genuine later change is a different request.
   */
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

  // Minted here so the raw value never leaves the server: this submission is
  // anonymous, so nothing is authorised to receive an edit credential (§6.4).
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
    // §13: the database error may name columns and constraints. It is logged
    // server-side by the platform; the guest gets a sentence they can act on.
    console.error('submit_rsvp failed', { code: error.code });
    return { status: 'error', message: UI_MESSAGES.rsvp.unknownError, fieldErrors: {} };
  }

  const outcome = (result as { outcome?: string } | null)?.outcome;
  if (outcome === 'idempotency_conflict' || outcome === 'event_unavailable') {
    return { status: 'error', message: UI_MESSAGES.rsvp.unknownError, fieldErrors: {} };
  }

  revalidatePath('/');

  return {
    status: 'success',
    // 'accepted' is what §6.4 returns to an unauthenticated caller whether the row
    // was created or the phone was already taken. The guest sees one honest
    // acknowledgement either way; only the host learns which it was.
    message: successMessage(submission.attendanceStatus),
    fieldErrors: {},
  };
}
