'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';

import { assertPlatformOwner } from '@/app/_lib/platformAdmin';
import { testWhatsAppSenderConnection } from '@/app/_lib/whatsappCloud';
import { createPrivilegedClient } from '@/lib/server/supabase';

const senderSchema = z.object({
  senderPhone: z
    .string()
    .trim()
    .regex(/^\+?[0-9]{8,15}$/),
  phoneNumberId: z
    .string()
    .trim()
    .regex(/^[0-9]{5,32}$/),
});

function value(formData: FormData, name: string): string {
  const entry = formData.get(name);
  return typeof entry === 'string' ? entry.trim() : '';
}

function settingsUrl(params: Record<string, string>): string {
  const search = new URLSearchParams(params);
  return `/admin/settings/whatsapp?${search.toString()}`;
}

export async function adminSaveWhatsAppSenderAction(formData: FormData): Promise<void> {
  const admin = await assertPlatformOwner();
  const parsed = senderSchema.safeParse({
    senderPhone: value(formData, 'senderPhone'),
    phoneNumberId: value(formData, 'phoneNumberId'),
  });

  if (!parsed.success) {
    redirect(settingsUrl({ error: 'invalid-settings' }));
  }

  const db = createPrivilegedClient();
  const { error } = await db.from('platform_whatsapp_settings').upsert({
    id: 'default',
    sender_phone: parsed.data.senderPhone,
    phone_number_id: parsed.data.phoneNumberId,
    updated_by: admin.id,
    updated_at: new Date().toISOString(),
  });

  if (error) throw new Error(`WhatsApp settings write failed: ${error.code}`);

  const { error: auditError } = await db.from('audit_logs').insert({
    admin_user_id: admin.id,
    action: 'platform_whatsapp_settings_updated',
    entity_type: 'platform_whatsapp_settings',
    entity_id: null,
    metadata: {
      senderPhone: parsed.data.senderPhone,
      phoneNumberId: parsed.data.phoneNumberId,
    },
  });

  if (auditError) throw new Error(`WhatsApp settings audit failed: ${auditError.code}`);

  revalidatePath('/admin/settings/whatsapp');
  redirect(settingsUrl({ saved: '1' }));
}

export async function adminTestWhatsAppSenderAction(formData: FormData): Promise<void> {
  await assertPlatformOwner();
  const parsed = senderSchema.safeParse({
    senderPhone: value(formData, 'senderPhone'),
    phoneNumberId: value(formData, 'phoneNumberId'),
  });

  if (!parsed.success) {
    redirect(settingsUrl({ error: 'invalid-settings' }));
  }

  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN?.trim();
  if (!accessToken) {
    redirect(
      settingsUrl({
        error: 'meta-not-configured',
        phone: parsed.data.senderPhone,
        phoneNumberId: parsed.data.phoneNumberId,
      }),
    );
  }

  try {
    const result = await testWhatsAppSenderConnection({
      accessToken,
      phoneNumberId: parsed.data.phoneNumberId,
      graphVersion: process.env.WHATSAPP_GRAPH_VERSION?.trim() || 'v23.0',
    });

    redirect(
      settingsUrl({
        tested: '1',
        phone: result.displayPhoneNumber,
        phoneNumberId: parsed.data.phoneNumberId,
        name: result.verifiedName ?? '',
      }),
    );
  } catch (error) {
    const code =
      error instanceof Error && /^whatsapp_http_[a-z0-9_]+$/i.test(error.message)
        ? error.message
        : 'meta-unreachable';
    redirect(
      settingsUrl({
        error: code,
        phone: parsed.data.senderPhone,
        phoneNumberId: parsed.data.phoneNumberId,
      }),
    );
  }
}
