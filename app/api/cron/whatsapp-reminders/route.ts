import { NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';

import { buildWhatsAppCloudPayload } from '@/lib/premiumEventTools';
import { createPrivilegedClient } from '@/lib/server/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface DueMessageRow {
  readonly id: string;
  readonly recipient_phone: string;
  readonly template_name: string;
  readonly language_code: string;
  readonly events: { readonly title: string; readonly public_id: string } | null;
  readonly guests: { readonly full_name: string } | null;
}

function authorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  return secret !== undefined && request.headers.get('authorization') === `Bearer ${secret}`;
}

export async function GET(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const siteOrigin = process.env.NEXT_PUBLIC_SITE_URL;
  if (accessToken === undefined || phoneNumberId === undefined || siteOrigin === undefined) {
    return NextResponse.json({ error: 'whatsapp_not_configured' }, { status: 503 });
  }

  const db = createPrivilegedClient() as unknown as SupabaseClient;
  const now = new Date().toISOString();
  const { data, error } = await db
    .from('event_messages')
    .select(
      'id, recipient_phone, template_name, language_code, events(title, public_id), guests(full_name)',
    )
    .eq('status', 'pending')
    .lte('scheduled_for', now)
    .order('scheduled_for')
    .limit(50);

  if (error) return NextResponse.json({ error: 'queue_read_failed' }, { status: 500 });

  let sent = 0;
  let failed = 0;
  const graphVersion = process.env.WHATSAPP_GRAPH_VERSION ?? 'v23.0';

  for (const raw of data ?? []) {
    const message = raw as unknown as DueMessageRow;
    if (message.events === null || message.guests === null) {
      await db
        .from('event_messages')
        .update({
          status: 'failed',
          error_message: 'missing_event_or_guest',
          updated_at: new Date().toISOString(),
        })
        .eq('id', message.id)
        .eq('status', 'pending');
      failed += 1;
      continue;
    }

    const { data: claimed } = await db
      .from('event_messages')
      .update({ status: 'processing', updated_at: new Date().toISOString() })
      .eq('id', message.id)
      .eq('status', 'pending')
      .select('id');
    if (claimed === null || claimed.length === 0) continue;

    try {
      const response = await fetch(
        `https://graph.facebook.com/${graphVersion}/${phoneNumberId}/messages`,
        {
          method: 'POST',
          headers: {
            authorization: `Bearer ${accessToken}`,
            'content-type': 'application/json',
          },
          body: JSON.stringify(
            buildWhatsAppCloudPayload({
              templateName: message.template_name,
              languageCode: message.language_code,
              recipientPhone: message.recipient_phone,
              guestName: message.guests.full_name,
              eventTitle: message.events.title,
              invitationUrl: `${siteOrigin.replace(/\/$/, '')}/e/${message.events.public_id}`,
            }),
          ),
        },
      );

      const payload = (await response.json()) as {
        readonly messages?: readonly { readonly id?: string }[];
        readonly error?: { readonly message?: string };
      };
      if (!response.ok) throw new Error(payload.error?.message ?? `http_${response.status}`);

      await db
        .from('event_messages')
        .update({
          status: 'sent',
          provider_message_id: payload.messages?.[0]?.id ?? null,
          error_message: null,
          sent_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', message.id);
      sent += 1;
    } catch (sendError) {
      await db
        .from('event_messages')
        .update({
          status: 'failed',
          error_message:
            sendError instanceof Error ? sendError.message.slice(0, 500) : 'send_failed',
          updated_at: new Date().toISOString(),
        })
        .eq('id', message.id);
      failed += 1;
    }
  }

  return NextResponse.json({ processed: sent + failed, sent, failed });
}
