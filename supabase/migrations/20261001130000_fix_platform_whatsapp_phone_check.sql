-- The first version of platform_whatsapp_settings escaped the regex twice
-- ('^\\+?...' in a standard-conforming string), so the check demanded a literal
-- backslash and rejected every real phone number. Re-create it with the intended
-- pattern; safe to run whether or not the earlier constraint exists.

alter table public.platform_whatsapp_settings
  drop constraint if exists platform_whatsapp_settings_sender_phone_shape;

alter table public.platform_whatsapp_settings
  add constraint platform_whatsapp_settings_sender_phone_shape
    check (sender_phone ~ '^\+?[0-9]{8,15}$');

-- Retry the one-time carry-over that the broken pattern filtered out.
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
