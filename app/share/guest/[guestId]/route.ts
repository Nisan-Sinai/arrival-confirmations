import { NextResponse } from 'next/server';
import { prefixHebrew } from '@/lib/hebrew';
import type { SupabaseClient } from '@supabase/supabase-js';

import { PLATFORM_OWNER_EMAIL } from '@/app/_lib/platformAdmin';
import { appConfig } from '@/config/event.config';
import {
  buildPremiumWhatsAppMessage,
  parsePremiumMessageKind,
  PERSONAL_INVITE_NOTE_MAX,
} from '@/lib/premiumWhatsApp';
import { createPrivilegedClient, createUserClient } from '@/lib/server/supabase';
import { issueToken, TOKEN_PURPOSES } from '@/lib/server/tokens';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ guestId: string }> },
): Promise<NextResponse> {
  const { guestId } = await params;
  const userClient = await createUserClient();
  const {
    data: { user },
  } = await userClient.auth.getUser();
  if (user === null) return NextResponse.redirect(new URL('/login', request.url));

  const privileged = createPrivilegedClient() as unknown as SupabaseClient;
  const { data: guest, error: guestError } = await privileged
    .from('guests')
    .select('id, event_id, full_name, phone, phone_normalized, is_active')
    .eq('id', guestId)
    .maybeSingle();
  if (guestError || guest === null || !guest.is_active) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  const { data: event, error: eventError } = await privileged
    .from('events')
    .select('id, owner_user_id, title, is_active')
    .eq('id', guest.event_id)
    .maybeSingle();
  if (eventError || event === null) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  const isPlatformOwner = user.email?.toLowerCase() === PLATFORM_OWNER_EMAIL;
  if (!isPlatformOwner && event.owner_user_id !== user.id) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  const invite = issueToken(TOKEN_PURPOSES.invite);
  const expiresAt = new Date(
    Date.now() + appConfig.inviteTokenTtlDays * 24 * 60 * 60 * 1000,
  ).toISOString();
  const now = new Date().toISOString();

  const { error: updateError } = await privileged
    .from('guests')
    .update({
      invite_token_hash: invite.hash,
      token_expires_at: expiresAt,
      token_revoked_at: null,
      invite_link_issued_at: now,
    })
    .eq('id', guest.id)
    .eq('event_id', event.id);
  if (updateError) {
    return NextResponse.redirect(
      new URL(
        isPlatformOwner
          ? `/admin/events/${event.id}?error=invite-link`
          : `/dashboard/events/${event.id}/guests?error=invite-link`,
        request.url,
      ),
    );
  }

  await privileged
    .from('invite_sessions')
    .update({ revoked_at: now })
    .eq('guest_id', guest.id)
    .is('revoked_at', null);

  await privileged.from('audit_logs').insert({
    admin_user_id: isPlatformOwner ? user.id : null,
    action: isPlatformOwner ? 'admin_guest_invite_issued' : 'host_guest_invite_issued',
    entity_type: 'guest',
    entity_id: guest.id,
    metadata: { eventId: event.id, expiresAt, issuedAt: now },
  });

  const requestUrl = new URL(request.url);
  const personalUrl = `${requestUrl.origin}/invite/${invite.raw}`;

  // The one-by-one list sends no `kind` and keeps the wording it always had. The Premium
  // send centre passes a template — invitation, reminder or an update carrying the host's
  // own words — and it is built here, around this guest's *personal* link, so the reply
  // is attributed instead of arriving anonymously through the public form. `thanks` never
  // reaches this route: it carries no link, so there is nothing to issue a token for.
  const templateKind = parsePremiumMessageKind(requestUrl.searchParams.get('kind'));
  const message =
    templateKind === null || templateKind === 'thanks'
      ? [
          `היי ${guest.full_name},`,
          `נשמח לקבל את אישור ההגעה שלך ${prefixHebrew('ל', event.title)}.`,
          '',
          'בלחיצה על הקישור אפשר לבחור מגיע/ה, לא מגיע/ה או אולי:',
          personalUrl,
        ].join('\n')
      : buildPremiumWhatsAppMessage({
          kind: templateKind,
          guestName: guest.full_name,
          eventTitle: event.title,
          inviteUrl: personalUrl,
          note: (requestUrl.searchParams.get('note') ?? '').slice(0, PERSONAL_INVITE_NOTE_MAX),
        });
  const phone = guest.phone_normalized.replace(/^\+/, '');
  const whatsappUrl = `https://api.whatsapp.com/send?phone=${encodeURIComponent(phone)}&text=${encodeURIComponent(message)}`;

  return NextResponse.redirect(whatsappUrl);
}
