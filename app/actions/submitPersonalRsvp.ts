'use server';

import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import type { SupabaseClient } from '@supabase/supabase-js';

import { canAcceptRsvp, getEventLicense } from '@/app/_lib/eventLicenses';
import { isMonetizedEvent } from '@/app/_lib/plans';
import { appConfig } from '@/config/event.config';
import { resolveClientIpHash } from '@/lib/server/ip';
import { getActiveInviteContext } from '@/lib/server/currentInvite';
import { createPrivilegedClient } from '@/lib/server/supabase';
import { hashIdentity, issueToken, TOKEN_PURPOSES } from '@/lib/server/tokens';

export interface PersonalRsvpState {
  readonly status: 'idle' | 'success' | 'error';
  readonly message: string;
  readonly selected?: 'attending' | 'not_attending' | 'maybe';
}

const RATE_LIMIT_PER_WINDOW = 10;
const RATE_LIMIT_WINDOW_SECONDS = 300;

function attendanceStatus(
  value: FormDataEntryValue | null,
): 'attending' | 'not_attending' | 'maybe' | null {
  return value === 'attending' || value === 'not_attending' || value === 'maybe' ? value : null;
}

function successMessage(status: 'attending' | 'not_attending' | 'maybe'): string {
  if (status === 'attending') return 'תודה! סימנו שתגיעו בשמחה.';
  if (status === 'not_attending') return 'תודה על העדכון. סימנו שלא תוכלו להגיע.';
  return 'תודה! סימנו שעדיין אינכם בטוחים.';
}

export async function submitPersonalRsvpAction(
  _previous: PersonalRsvpState,
  formData: FormData,
): Promise<PersonalRsvpState> {
  const selected = attendanceStatus(formData.get('attendanceStatus'));
  if (selected === null) {
    return { status: 'error', message: 'יש לבחור אחת משלוש האפשרויות.' };
  }

  const context = await getActiveInviteContext();
  if (context === null) {
    return {
      status: 'error',
      message: 'הקישור האישי אינו תקף עוד. בקשו מבעלי האירוע לשלוח קישור חדש.',
      selected,
    };
  }

  const privileged = createPrivilegedClient();
  const { data: eventRow, error: eventError } = await privileged
    .from('events')
    .select('id, created_at')
    .eq('id', context.event.id)
    .eq('is_active', true)
    .maybeSingle();
  if (eventError || eventRow === null) {
    return { status: 'error', message: 'האירוע אינו זמין כרגע.', selected };
  }

  const fallback = isMonetizedEvent(eventRow.created_at) ? 'trial' : 'legacy';
  const [license, countResult, existingResult] = await Promise.all([
    getEventLicense(eventRow.id, fallback),
    privileged
      .from('rsvps')
      .select('id', { count: 'exact', head: true })
      .eq('event_id', eventRow.id),
    privileged
      .from('rsvps')
      .select('id')
      .eq('event_id', eventRow.id)
      .eq('phone_normalized', context.guest.phoneNormalized)
      .maybeSingle(),
  ]);
  if (countResult.error || existingResult.error) {
    return { status: 'error', message: 'שמירת האישור נכשלה. נסו שוב.', selected };
  }
  if (!canAcceptRsvp(license, countResult.count ?? 0, existingResult.data !== null)) {
    return {
      status: 'error',
      message: 'האירוע אינו מקבל כרגע אישורי הגעה נוספים. פנו לבעלי האירוע.',
      selected,
    };
  }

  const { hash: ipHash } = resolveClientIpHash(await headers());
  const bucket = `personal-rsvp:${ipHash}:${context.guest.id}`;
  const { data: limit } = await privileged.rpc('consume_rate_limit', {
    p_bucket_key: bucket,
    p_limit: RATE_LIMIT_PER_WINDOW,
    p_window_seconds: RATE_LIMIT_WINDOW_SECONDS,
  });
  if (limit?.[0]?.allowed === false) {
    return {
      status: 'error',
      message: 'בוצעו יותר מדי ניסיונות. נסו שוב בעוד כמה דקות.',
      selected,
    };
  }

  const adults = selected === 'not_attending' ? 0 : context.guest.partySize;
  const fingerprint = hashIdentity(
    JSON.stringify([context.sessionId, selected, adults]),
    TOKEN_PURPOSES.idempotency,
  );
  const idempotencyKeyHash = hashIdentity(
    `${context.event.id}:${context.guest.id}:${fingerprint}`,
    TOKEN_PURPOSES.idempotency,
  );
  const updateToken = issueToken(TOKEN_PURPOSES.update);

  const { data: result, error } = await privileged.rpc('submit_rsvp', {
    p_event_id: context.event.id,
    p_guest_id: context.guest.id,
    p_full_name: context.guest.fullName,
    p_phone: context.guest.phone,
    p_phone_normalized: context.guest.phoneNormalized,
    p_family_side: context.guest.familySide,
    p_attendance_status: selected,
    p_adults: adults,
    p_children: 0,
    p_babies: 0,
    p_dietary: null,
    p_notes: null,
    p_consent: true,
    p_source: 'personal_link',
    p_idempotency_key_hash: idempotencyKeyHash,
    p_request_fingerprint: fingerprint,
    p_update_token_hash: null,
    p_new_update_token_hash: updateToken.hash,
    p_update_token_ttl_days: appConfig.updateTokenTtlDays,
    p_idempotency_ttl_hours: appConfig.idempotencyTtlHours,
  });

  if (error) {
    return { status: 'error', message: 'שמירת האישור נכשלה. נסו שוב.', selected };
  }
  const outcome = (result as { outcome?: string } | null)?.outcome;
  if (
    outcome === 'idempotency_conflict' ||
    outcome === 'event_unavailable' ||
    outcome === 'invitation_invalid'
  ) {
    return { status: 'error', message: 'לא ניתן לשמור את האישור דרך הקישור הזה.', selected };
  }

  const trackingDb = privileged as unknown as SupabaseClient;
  await trackingDb.rpc('record_guest_invite_response', {
    p_guest_id: context.guest.id,
    p_event_id: context.event.id,
    p_status: selected,
  });

  revalidatePath('/invite');
  revalidatePath(`/dashboard/events/${context.event.id}`);
  revalidatePath(`/dashboard/events/${context.event.id}/guests`);
  revalidatePath(`/admin/events/${context.event.id}`);

  return { status: 'success', message: successMessage(selected), selected };
}
