-- Durable platform-wide WhatsApp sender configuration.
-- Secrets remain in Vercel; this table stores only the display number and Meta Phone Number ID.

create table if not exists public.platform_whatsapp_settings (
  id text primary key default 'default',
  sender_phone text not null,
  phone_number_id text not null,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  constraint platform_whatsapp_settings_singleton check (id = 'default'),
  constraint platform_whatsapp_settings_sender_phone_shape
    check (sender_phone ~ '^\+?[0-9]{8,15}$'),
  constraint platform_whatsapp_settings_phone_number_id_shape
    check (phone_number_id ~ '^[0-9]{5,32}$')
);

alter table public.platform_whatsapp_settings enable row level security;

revoke all on table public.platform_whatsapp_settings from anon, authenticated;
grant select, insert, update, delete on table public.platform_whatsapp_settings to service_role;

comment on table public.platform_whatsapp_settings is
  'Server-only singleton for the active WhatsApp sender. Access token and templates stay in Vercel.';

-- Preserve any sender that was saved while the preview used audit_logs as temporary storage.
insert into public.platform_whatsapp_settings (
  id,
  sender_phone,
  phone_number_id,
  updated_by,
  updated_at
)
select
  'default',
  metadata ->> 'senderPhone',
  metadata ->> 'phoneNumberId',
  admin_user_id,
  created_at
from public.audit_logs
where entity_type = 'platform_whatsapp_settings'
  and action = 'platform_whatsapp_settings_updated'
  and (metadata ->> 'senderPhone') ~ '^\+?[0-9]{8,15}$'
  and (metadata ->> 'phoneNumberId') ~ '^[0-9]{5,32}$'
order by created_at desc
limit 1
on conflict (id) do nothing;
