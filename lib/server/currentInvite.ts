import 'server-only';

import { cookies } from 'next/headers';
import type { SupabaseClient } from '@supabase/supabase-js';

import {
  hashSessionToken,
  INVITE_SESSION_COOKIE,
  isWellFormedRawToken,
  validateInviteSession,
} from '@/lib/server/inviteSession';
import { createPrivilegedClient } from '@/lib/server/supabase';

export interface ActiveInviteContext {
  readonly sessionId: string;
  readonly event: {
    readonly id: string;
    readonly publicId: string;
    readonly title: string;
    readonly eventType: string;
    readonly hostsNames: string;
    readonly honoreeDisplayName: string;
    readonly eventDate: string;
    readonly ceremonyTime: string | null;
    readonly receptionTime: string | null;
    readonly venueName: string;
    readonly address: string;
    readonly wazeUrl: string | null;
    readonly googleMapsUrl: string | null;
    readonly contactPhone: string | null;
    readonly description: string | null;
    readonly sideALabel: string | null;
    readonly sideBLabel: string | null;
  };
  readonly guest: {
    readonly id: string;
    readonly fullName: string;
    readonly phone: string;
    readonly phoneNormalized: string;
    readonly partySize: number;
    readonly familySide: 'side_a' | 'side_b' | 'other' | null;
    /**
     * Where they are sitting, once the host has seated them.
     *
     * Already on the guest row — the seating studio writes it — and never once shown to
     * the person it is about. Competitors treat telling a guest their table as a paid
     * day-of service; the data was here all along.
     */
    readonly tableName: string | null;
    readonly seatNumber: string | null;
  };
}

export async function getActiveInviteContext(): Promise<ActiveInviteContext | null> {
  const cookieStore = await cookies();
  const rawSession = cookieStore.get(INVITE_SESSION_COOKIE)?.value;
  if (!isWellFormedRawToken(rawSession)) return null;

  const privileged = createPrivilegedClient() as unknown as SupabaseClient;
  const sessionHash = hashSessionToken(rawSession);
  const { data: session, error: sessionError } = await privileged
    .from('invite_sessions')
    .select('id, event_id, guest_id, expires_at, revoked_at')
    .eq('session_token_hash', sessionHash)
    .maybeSingle();
  if (sessionError || session === null) return null;

  const validation = validateInviteSession({
    guestId: session.guest_id,
    eventId: session.event_id,
    expiresAt: new Date(session.expires_at),
    revokedAt: session.revoked_at === null ? null : new Date(session.revoked_at),
  });
  if (!validation.valid) return null;

  const [{ data: guest, error: guestError }, { data: event, error: eventError }] =
    await Promise.all([
      privileged
        .from('guests')
        .select(
          'id, event_id, full_name, phone, phone_normalized, party_size, family_side, table_name, seat_number, is_active',
        )
        .eq('id', validation.guestId)
        .eq('event_id', validation.eventId)
        .maybeSingle(),
      privileged
        .from('events')
        .select(
          'id, public_id, title, event_type, hosts_names, honoree_display_name, event_date, ceremony_time, reception_time, venue_name, address, waze_url, google_maps_url, contact_phone, description, side_a_label, side_b_label, is_active',
        )
        .eq('id', validation.eventId)
        .maybeSingle(),
    ]);

  if (
    guestError ||
    eventError ||
    guest === null ||
    event === null ||
    !guest.is_active ||
    !event.is_active
  ) {
    return null;
  }

  return {
    sessionId: session.id,
    event: {
      id: event.id,
      publicId: event.public_id,
      title: event.title,
      eventType: event.event_type,
      hostsNames: event.hosts_names,
      honoreeDisplayName: event.honoree_display_name,
      eventDate: event.event_date,
      ceremonyTime: event.ceremony_time,
      receptionTime: event.reception_time,
      venueName: event.venue_name,
      address: event.address,
      wazeUrl: event.waze_url,
      googleMapsUrl: event.google_maps_url,
      contactPhone: event.contact_phone,
      description: event.description,
      sideALabel: event.side_a_label,
      sideBLabel: event.side_b_label,
    },
    guest: {
      id: guest.id,
      fullName: guest.full_name,
      phone: guest.phone,
      phoneNormalized: guest.phone_normalized,
      partySize: guest.party_size,
      familySide: guest.family_side,
      tableName: guest.table_name,
      seatNumber: guest.seat_number,
    },
  };
}
