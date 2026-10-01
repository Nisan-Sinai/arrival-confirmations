import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';

import { appConfig } from '@/config/event.config';
import type { PremiumMessageKind } from '@/lib/premiumWhatsApp';
import { issueToken, TOKEN_PURPOSES } from '@/lib/server/tokens';

import {
  sendWhatsAppTemplate,
  type WhatsAppCloudConfig,
  type WhatsAppSendResult,
} from './whatsappCloud';

export interface WhatsAppGuest {
  readonly id: string;
  readonly fullName: string;
  readonly phone: string;
}

export interface WhatsAppEvent {
  readonly id: string;
  readonly title: string;
}

export async function issueAutomaticInviteUrl(input: {
  readonly db: SupabaseClient;
  readonly eventId: string;
  readonly guestId: string;
  readonly siteOrigin: string;
}): Promise<string> {
  const invite = issueToken(TOKEN_PURPOSES.invite);
  const now = new Date().toISOString();
  const expiresAt = new Date(
    Date.now() + appConfig.inviteTokenTtlDays * 24 * 60 * 60 * 1000,
  ).toISOString();

  const { error } = await input.db
    .from('guests')
    .update({
      invite_token_hash: invite.hash,
      token_expires_at: expiresAt,
      token_revoked_at: null,
      invite_link_issued_at: now,
    })
    .eq('id', input.guestId)
    .eq('event_id', input.eventId);

  if (error) throw new Error('invite_token_write_failed');

  await input.db
    .from('invite_sessions')
    .update({ revoked_at: now })
    .eq('guest_id', input.guestId)
    .is('revoked_at', null);

  return `${input.siteOrigin.replace(/\/$/, '')}/invite/${invite.raw}`;
}

export async function deliverAutomaticWhatsApp(input: {
  readonly db: SupabaseClient;
  readonly config: WhatsAppCloudConfig;
  readonly event: WhatsAppEvent;
  readonly guest: WhatsAppGuest;
  readonly kind: PremiumMessageKind;
  readonly note?: string;
  readonly siteOrigin: string;
}): Promise<WhatsAppSendResult> {
  const invitationUrl =
    input.kind === 'thanks'
      ? null
      : await issueAutomaticInviteUrl({
          db: input.db,
          eventId: input.event.id,
          guestId: input.guest.id,
          siteOrigin: input.siteOrigin,
        });

  return sendWhatsAppTemplate(input.config, {
    kind: input.kind,
    recipientPhone: input.guest.phone,
    guestName: input.guest.fullName,
    eventTitle: input.event.title,
    invitationUrl,
    note: input.note,
  });
}
