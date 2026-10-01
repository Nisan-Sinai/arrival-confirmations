import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';

interface SettingsRow {
  readonly sender_phone: string;
  readonly phone_number_id: string;
  readonly updated_at: string;
  readonly updated_by: string | null;
}

export interface PlatformWhatsAppSettings {
  readonly senderPhone: string;
  readonly phoneNumberId: string;
  readonly updatedAt: string;
  readonly updatedBy: string | null;
}

export function parsePlatformWhatsAppSettings(
  row: SettingsRow | null,
): PlatformWhatsAppSettings | null {
  if (row === null) return null;

  const senderPhone = row.sender_phone.trim();
  const phoneNumberId = row.phone_number_id.trim();

  if (!/^\+?[0-9]{8,15}$/.test(senderPhone) || !/^[0-9]{5,32}$/.test(phoneNumberId)) {
    return null;
  }

  return {
    senderPhone,
    phoneNumberId,
    updatedAt: row.updated_at,
    updatedBy: row.updated_by,
  };
}

export async function loadPlatformWhatsAppSettings(
  db: SupabaseClient,
): Promise<PlatformWhatsAppSettings | null> {
  const { data, error } = await db
    .from('platform_whatsapp_settings')
    .select('sender_phone, phone_number_id, updated_at, updated_by')
    .eq('id', 'default')
    .maybeSingle();

  if (error) throw new Error(`whatsapp_settings_read_failed_${error.code}`);
  return parsePlatformWhatsAppSettings((data as SettingsRow | null) ?? null);
}
