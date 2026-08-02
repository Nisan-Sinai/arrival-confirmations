import { NextResponse } from 'next/server';

import {
  hashInviteToken,
  INVITE_SESSION_COOKIE,
  inviteSessionCookieOptions,
  isWellFormedRawToken,
  mintInviteSession,
  validateInviteToken,
} from '@/lib/server/inviteSession';
import { createPrivilegedClient } from '@/lib/server/supabase';

export const dynamic = 'force-dynamic';

function rejected(request: Request): NextResponse {
  const response = NextResponse.redirect(new URL('/invite?error=invalid', request.url));
  response.cookies.delete(INVITE_SESSION_COOKIE);
  return response;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> },
): Promise<NextResponse> {
  const { token } = await params;
  if (!isWellFormedRawToken(token)) return rejected(request);

  const privileged = createPrivilegedClient();
  const inviteHash = hashInviteToken(token);
  const { data: guest, error: guestError } = await privileged
    .from('guests')
    .select('id, event_id, is_active, token_expires_at, token_revoked_at')
    .eq('invite_token_hash', inviteHash)
    .maybeSingle();
  if (guestError) return rejected(request);

  const validation = validateInviteToken(
    guest === null
      ? null
      : {
          guestId: guest.id,
          eventId: guest.event_id,
          isActive: guest.is_active,
          tokenExpiresAt:
            guest.token_expires_at === null ? null : new Date(guest.token_expires_at),
          tokenRevokedAt:
            guest.token_revoked_at === null ? null : new Date(guest.token_revoked_at),
        },
  );
  if (!validation.valid) return rejected(request);

  const { data: event, error: eventError } = await privileged
    .from('events')
    .select('id, is_active')
    .eq('id', validation.eventId)
    .maybeSingle();
  if (eventError || event === null || !event.is_active) return rejected(request);

  const session = mintInviteSession();
  const { error: sessionError } = await privileged.from('invite_sessions').insert({
    event_id: validation.eventId,
    guest_id: validation.guestId,
    session_token_hash: session.sessionTokenHash,
    expires_at: session.expiresAt.toISOString(),
  });
  if (sessionError) return rejected(request);

  await privileged.from('audit_logs').insert({
    action: 'invite_session_created',
    entity_type: 'guest',
    entity_id: validation.guestId,
    metadata: { eventId: validation.eventId, expiresAt: session.expiresAt.toISOString() },
  });

  const response = NextResponse.redirect(new URL('/invite', request.url));
  response.cookies.set(
    INVITE_SESSION_COOKIE,
    session.rawSessionToken,
    inviteSessionCookieOptions(),
  );
  return response;
}
