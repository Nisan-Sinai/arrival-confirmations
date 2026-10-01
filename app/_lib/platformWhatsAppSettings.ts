import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';

interface SettingsAuditRow {
  readonly created_at: string;
  readonly admin_user_id: string | null;
  readonly metadata: unknown;
}

export interface PlatformWhatsAppSettings {
  readonly senderPhone: string;
  readonly phoneNumberId: string;
  readonly updatedAt: string;
  readonly updatedBy: string | null;
}

function record(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

export function parsePlatformWhatsAppSettings(
  row: SettingsAuditRow | null,
): PlatformWhatsAppSettings | null {
  if (row === null) return null;
  const metadata = record(row.metadata);
  if (metadata === null) return null;

  const senderPhone =
    typeof metadata['senderPhone'] === 'string' ? metadata['senderPhone'].trim() : '';
  const phoneNumberId =
    typeof metadata['phoneNumberId'] === 'string' ? metadata['phoneNumberId'].trim() : '';

  if (!/^\+?[0-9]{8,15}$/.test(senderPhone) || !/^[0-9]{5,32}$/.test(phoneNumberId)) {
    return null;
  }

  return {
    senderPhone,
    phoneNumberId,
    updatedAt: row.created_at,
    updatedBy: row.admin_user_id,
  };
}

export async function loadPlatformWhatsAppSettings(
  db: SupabaseClient,
): Promise<PlatformWhatsAppSettings | null> {
  const { data, error } = await db
    .from('audit_logs')
    .select('created_at, admin_user_id, metadata')
    .eq('entity_type', 'platform_whatsapp_settings')
    .eq('action', 'platform_whatsapp_settings_updated')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(`whatsapp_settings_read_failed_${error.code}`);
  return parsePlatformWhatsAppSettings((data as SettingsAuditRow | null) ?? null);
}
