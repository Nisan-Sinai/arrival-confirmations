import { NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';

import { loadPlatformWhatsAppSettings } from '@/app/_lib/platformWhatsAppSettings';
import { readWhatsAppCloudConfig } from '@/app/_lib/whatsappCloud';
import { deliverAutomaticWhatsApp } from '@/app/_lib/whatsappServer';
import { parsePremiumMessageKind } from '@/lib/premiumWhatsApp';
import { createPrivilegedClient } from '@/lib/server/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface DueMessageRow {
  readonly id: string;
  readonly event_id: string;
  readonly guest_id: string | null;
  readonly recipient_phone: string;
  readonly message_kind: string;
  readonly message_note: string | null;
  readonly attempt_count: number;
  readonly events: { readonly id: string; readonly title: string } | null;
  readonly guests: { readonly id: string; readonly full_name: string } | null;
}

function authorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  return secret !== undefined && request.headers.get('authorization') === `Bearer ${secret}`;
}

function safeErrorCode(error: unknown): string {
  if (!(error instanceof Error)) return 'send_failed';
  return /^[a-z0-9_]+$/i.test(error.message) ? error.message.slice(0, 200) : 'send_failed';
}

export async function GET(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const db = createPrivilegedClient() as unknown as SupabaseClient;
  const senderSettings = await loadPlatformWhatsAppSettings(db);
  const whatsapp = readWhatsAppCloudConfig({
    ...process.env,
    ...(senderSettings === null ? {} : { WHATSAPP_PHONE_NUMBER_ID: senderSettings.phoneNumberId }),
  });
  const siteOrigin = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (whatsapp.config === null || siteOrigin === undefined || siteOrigin === '') {
    return NextResponse.json(
      {
        error: 'whatsapp_not_configured',
        missing: [
          ...whatsapp.missing,
          ...(siteOrigin === undefined || siteOrigin === '' ? ['NEXT_PUBLIC_SITE_URL'] : []),
        ],
      },
      { status: 503 },
    );
  }

  const now = new Date().toISOString();
  const { data, error } = await db
    .from('event_messages')
    .select(
      'id, event_id, guest_id, recipient_phone, message_kind, message_note, attempt_count, events(id, title), guests(id, full_name)',
    )
    .eq('status', 'pending')
    .lte('scheduled_for', now)
    .order('scheduled_for')
    .limit(50);

  if (error) return NextResponse.json({ error: 'queue_read_failed' }, { status: 500 });

  let sent = 0;
  let failed = 0;

  for (const raw of data ?? []) {
    const message = raw as unknown as DueMessageRow;
    const kind = parsePremiumMessageKind(message.message_kind);

    if (
      kind === null ||
      message.guest_id === null ||
      message.events === null ||
      message.guests === null
    ) {
      await db
        .from('event_messages')
        .update({
          status: 'failed',
          error_message: 'invalid_queue_row',
          updated_at: new Date().toISOString(),
        })
        .eq('id', message.id)
        .eq('status', 'pending');
      failed += 1;
      continue;
    }

    const claimTime = new Date().toISOString();
    const { data: claimed } = await db
      .from('event_messages')
      .update({
        status: 'processing',
        attempt_count: message.attempt_count + 1,
        last_attempt_at: claimTime,
        updated_at: claimTime,
      })
      .eq('id', message.id)
      .eq('status', 'pending')
      .select('id');

    if (claimed === null || claimed.length === 0) continue;

    try {
      const delivery = await deliverAutomaticWhatsApp({
        db,
        config: whatsapp.config,
        event: { id: message.events.id, title: message.events.title },
        guest: {
          id: message.guests.id,
          fullName: message.guests.full_name,
          phone: message.recipient_phone,
        },
        kind,
        note: message.message_note ?? undefined,
        siteOrigin,
      });

      await db
        .from('event_messages')
        .update({
          status: 'sent',
          provider_message_id: delivery.providerMessageId,
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
          error_message: safeErrorCode(sendError),
          updated_at: new Date().toISOString(),
        })
        .eq('id', message.id);
      failed += 1;
    }
  }

  return NextResponse.json({ processed: sent + failed, sent, failed });
}
