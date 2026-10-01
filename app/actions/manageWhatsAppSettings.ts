'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';

import { assertPlatformOwner } from '@/app/_lib/platformAdmin';
import { readWhatsAppCloudConfig } from '@/app/_lib/whatsappCloud';
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

function cloudConfigWithPhoneNumberId(phoneNumberId: string) {
  return readWhatsAppCloudConfig({
    ...process.env,
    WHATSAPP_PHONE_NUMBER_ID: phoneNumberId,
  });
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
  const { error } = await db.from('audit_logs').insert({
    admin_user_id: admin.id,
    action: 'platform_whatsapp_settings_updated',
    entity_type: 'platform_whatsapp_settings',
    entity_id: null,
    metadata: {
      senderPhone: parsed.data.senderPhone,
      phoneNumberId: parsed.data.phoneNumberId,
    },
  });

  if (error) throw new Error(`WhatsApp settings write failed: ${error.code}`);

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

  const whatsapp = cloudConfigWithPhoneNumberId(parsed.data.phoneNumberId);
  if (whatsapp.config === null) {
    redirect(settingsUrl({ error: 'meta-not-configured' }));
  }

  let response: Response;
  try {
    response = await fetch(
      `https://graph.facebook.com/${whatsapp.config.graphVersion}/${parsed.data.phoneNumberId}?fields=display_phone_number,verified_name`,
      {
        headers: { authorization: `Bearer ${whatsapp.config.accessToken}` },
        cache: 'no-store',
        signal: AbortSignal.timeout(10_000),
      },
    );
  } catch {
    redirect(settingsUrl({ error: 'meta-unreachable' }));
  }

  const payload = (await response.json().catch(() => null)) as {
    readonly display_phone_number?: string;
    readonly verified_name?: string;
    readonly error?: { readonly code?: number };
  } | null;

  if (!response.ok) {
    const code = payload?.error?.code;
    redirect(
      settingsUrl({
        error: code === undefined ? 'meta-test-failed' : `meta-${code}`,
      }),
    );
  }

  redirect(
    settingsUrl({
      tested: '1',
      phone: payload?.display_phone_number ?? parsed.data.senderPhone,
      name: payload?.verified_name ?? '',
    }),
  );
}
