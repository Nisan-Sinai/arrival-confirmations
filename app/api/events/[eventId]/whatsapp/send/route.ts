import { NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';

import { getEventLicense } from '@/app/_lib/eventLicenses';
import { loadPlatformWhatsAppSettings } from '@/app/_lib/platformWhatsAppSettings';
import { isMonetizedEvent } from '@/app/_lib/plans';
import { readWhatsAppCloudConfig, WHATSAPP_BATCH_SIZE } from '@/app/_lib/whatsappCloud';
import { deliverAutomaticWhatsApp } from '@/app/_lib/whatsappServer';
import {
  PERSONAL_INVITE_NOTE_MAX,
  PREMIUM_MESSAGE_KINDS,
  type PremiumMessageKind,
} from '@/lib/premiumWhatsApp';
import { createPrivilegedClient, createUserClient } from '@/lib/server/supabase';
import { hashIdentity, TOKEN_PURPOSES } from '@/lib/server/tokens';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const bodySchema = z.object({
  campaignId: z.string().uuid(),
  guestIds: z.array(z.string().uuid()).min(1).max(WHATSAPP_BATCH_SIZE),
  kind: z.enum(PREMIUM_MESSAGE_KINDS),
  note: z.string().max(PERSONAL_INVITE_NOTE_MAX).optional(),
});

interface GuestRow {
  readonly id: string;
  readonly full_name: string;
  readonly phone_normalized: string;
}

interface ExistingMessageRow {
  readonly id: string;
  readonly status: string;
  readonly attempt_count: number;
}

function toolsEnabled(license: Awaited<ReturnType<typeof getEventLicense>>): boolean {
  return (
    license.plan === 'legacy' ||
    ((license.plan === 'premium' || license.plan === 'pro') && license.status === 'active')
  );
}

function safeErrorCode(error: unknown): string {
  if (!(error instanceof Error)) return 'send_failed';
  return /^[a-z0-9_]+$/i.test(error.message) ? error.message.slice(0, 200) : 'send_failed';
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ eventId: string }> },
): Promise<NextResponse> {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid_request' }, { status: 400 });
  }

  const { eventId } = await params;
  const userClient = await createUserClient();
  const {
    data: { user },
  } = await userClient.auth.getUser();
  if (user === null) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const userDb = userClient as unknown as SupabaseClient;
  const { data: event, error: eventError } = await userDb
    .from('events')
    .select('id, title, created_at')
    .eq('id', eventId)
    .maybeSingle();

  if (eventError || event === null) {
    return NextResponse.json({ error: 'event_not_found' }, { status: 404 });
  }

  const license = await getEventLicense(
    event.id,
    isMonetizedEvent(event.created_at) ? 'trial' : 'legacy',
  );
  if (!toolsEnabled(license)) {
    return NextResponse.json({ error: 'premium_required' }, { status: 403 });
  }

  const db = createPrivilegedClient() as unknown as SupabaseClient;
  const rateKey = hashIdentity(`${user.id}:${event.id}`, TOKEN_PURPOSES.rateLimit);
  const { data: rateData, error: rateError } = await db.rpc('consume_rate_limit', {
    p_bucket_key: `whatsapp-send:${rateKey}`,
    p_limit: 150,
    p_window_seconds: 3600,
  });
  const rateRows = (rateData ?? []) as unknown as readonly { readonly allowed: boolean }[];
  if (rateError || rateRows.length === 0) {
    return NextResponse.json({ error: 'rate_limit_unavailable' }, { status: 503 });
  }
  if (!rateRows[0]!.allowed) {
    return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
  }

  const senderSettings = await loadPlatformWhatsAppSettings(db);
  const whatsapp = readWhatsAppCloudConfig({
    ...process.env,
    ...(senderSettings === null ? {} : { WHATSAPP_PHONE_NUMBER_ID: senderSettings.phoneNumberId }),
  });
  if (whatsapp.config === null) {
    return NextResponse.json(
      { error: 'whatsapp_not_configured', missing: whatsapp.missing },
      { status: 503 },
    );
  }

  const configuredOrigin = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  const siteOrigin =
    configuredOrigin && configuredOrigin !== '' ? configuredOrigin : new URL(request.url).origin;

  const { data: guestData, error: guestError } = await db
    .from('guests')
    .select('id, full_name, phone_normalized')
    .eq('event_id', event.id)
    .eq('is_active', true)
    .in('id', parsed.data.guestIds);

  if (guestError) {
    return NextResponse.json({ error: 'guest_read_failed' }, { status: 500 });
  }

  const guestById = new Map(
    ((guestData ?? []) as unknown as GuestRow[]).map((guest) => [guest.id, guest] as const),
  );
  const results: {
    guestId: string;
    status: 'sent' | 'failed' | 'already_sent' | 'invalid';
  }[] = [];

  let sent = 0;
  let failed = 0;
  let alreadySent = 0;
  let invalid = 0;

  for (const guestId of parsed.data.guestIds) {
    const guest = guestById.get(guestId);
    if (guest === undefined || !/^\+972[0-9]{8,9}$/.test(guest.phone_normalized)) {
      invalid += 1;
      results.push({ guestId, status: 'invalid' });
      continue;
    }

    const { data: existing } = await db
      .from('event_messages')
      .select('id, status, attempt_count')
      .eq('campaign_id', parsed.data.campaignId)
      .eq('guest_id', guest.id)
      .eq('message_kind', parsed.data.kind)
      .maybeSingle();

    const existingMessage = existing as ExistingMessageRow | null;
    if (existingMessage?.status === 'sent') {
      alreadySent += 1;
      results.push({ guestId, status: 'already_sent' });
      continue;
    }

    const now = new Date().toISOString();
    let messageId = existingMessage?.id ?? null;

    if (messageId === null) {
      const { data: inserted, error: insertError } = await db
        .from('event_messages')
        .insert({
          event_id: event.id,
          guest_id: guest.id,
          campaign_id: parsed.data.campaignId,
          recipient_phone: guest.phone_normalized,
          message_kind: parsed.data.kind,
          message_note: parsed.data.note?.trim() || null,
          template_name: whatsapp.config.templates[parsed.data.kind],
          language_code: whatsapp.config.languageCode,
          scheduled_for: now,
          status: 'processing',
          attempt_count: 1,
          last_attempt_at: now,
        })
        .select('id')
        .single();

      if (insertError || inserted === null) {
        failed += 1;
        results.push({ guestId, status: 'failed' });
        continue;
      }
      messageId = (inserted as { id: string }).id;
    } else {
      const { error: claimError } = await db
        .from('event_messages')
        .update({
          status: 'processing',
          error_message: null,
          updated_at: now,
          last_attempt_at: now,
          attempt_count: (existingMessage?.attempt_count ?? 0) + 1,
        })
        .eq('id', messageId);

      if (claimError) {
        failed += 1;
        results.push({ guestId, status: 'failed' });
        continue;
      }
    }

    try {
      const delivery = await deliverAutomaticWhatsApp({
        db,
        config: whatsapp.config,
        event: { id: event.id, title: event.title },
        guest: { id: guest.id, fullName: guest.full_name, phone: guest.phone_normalized },
        kind: parsed.data.kind as PremiumMessageKind,
        note: parsed.data.note,
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
        .eq('id', messageId);

      sent += 1;
      results.push({ guestId, status: 'sent' });
    } catch (error) {
      await db
        .from('event_messages')
        .update({
          status: 'failed',
          error_message: safeErrorCode(error),
          updated_at: new Date().toISOString(),
        })
        .eq('id', messageId);

      failed += 1;
      results.push({ guestId, status: 'failed' });
    }
  }

  await db.from('audit_logs').insert({
    admin_user_id: null,
    action: 'host_whatsapp_campaign_batch',
    entity_type: 'event',
    entity_id: event.id,
    metadata: {
      campaignId: parsed.data.campaignId,
      kind: parsed.data.kind,
      requested: parsed.data.guestIds.length,
      sent,
      failed,
      alreadySent,
      invalid,
      userId: user.id,
    },
  });

  return NextResponse.json({
    campaignId: parsed.data.campaignId,
    requested: parsed.data.guestIds.length,
    sent,
    failed,
    alreadySent,
    invalid,
    results,
  });
}
