import type { Database } from '@/types/database.types';

export interface GuestInsert {
  readonly accessibility_needs?: string | null;
  readonly checked_in_at?: string | null;
  readonly created_at?: string;
  readonly email?: string | null;
  readonly event_id: string;
  readonly family_side?: Database['public']['Enums']['family_side'] | null;
  readonly full_name: string;
  readonly id?: string;
  readonly import_source?: string | null;
  readonly invite_token_hash?: string | null;
  readonly is_active?: boolean;
  readonly meal_preference?: string | null;
  readonly notes?: string | null;
  readonly party_size?: number;
  readonly phone: string;
  readonly phone_normalized: string;
  readonly seat_locked?: boolean;
  readonly seat_number?: string | null;
  readonly seating_group?: string | null;
  readonly seating_priority?: number;
  readonly table_id?: string | null;
  readonly table_name?: string | null;
  readonly token_expires_at?: string | null;
  readonly token_revoked_at?: string | null;
  readonly updated_at?: string;
}

export interface GuestUpdate {
  readonly accessibility_needs?: string | null;
  readonly checked_in_at?: string | null;
  readonly created_at?: string;
  readonly email?: string | null;
  readonly event_id?: string;
  readonly family_side?: Database['public']['Enums']['family_side'] | null;
  readonly full_name?: string;
  readonly id?: string;
  readonly import_source?: string | null;
  readonly invite_token_hash?: string | null;
  readonly is_active?: boolean;
  readonly meal_preference?: string | null;
  readonly notes?: string | null;
  readonly party_size?: number;
  readonly phone?: string;
  readonly phone_normalized?: string;
  readonly seat_locked?: boolean;
  readonly seat_number?: string | null;
  readonly seating_group?: string | null;
  readonly seating_priority?: number;
  readonly table_id?: string | null;
  readonly table_name?: string | null;
  readonly token_expires_at?: string | null;
  readonly token_revoked_at?: string | null;
  readonly updated_at?: string;
}
