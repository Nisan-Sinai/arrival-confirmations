-- Automatic WhatsApp Business campaigns.
-- One click in the dashboard sends server-side through the platform's single
-- WhatsApp Business number. Raw invitation tokens are never stored in this table.

alter table public.event_messages
  add column if not exists campaign_id uuid,
  add column if not exists message_note text,
  add column if not exists attempt_count integer not null default 0,
  add column if not exists last_attempt_at timestamptz;

alter table public.event_messages
  drop constraint if exists event_messages_kind_allowed;

alter table public.event_messages
  add constraint event_messages_kind_allowed
    check (message_kind in ('invitation', 'reminder', 'update', 'thanks')),
  add constraint event_messages_note_length
    check (message_note is null or char_length(message_note) <= 500),
  add constraint event_messages_attempt_count_nonnegative
    check (attempt_count >= 0);

create unique index if not exists event_messages_campaign_guest_kind_uidx
  on public.event_messages (campaign_id, guest_id, message_kind)
  where campaign_id is not null and guest_id is not null;

create index if not exists event_messages_campaign_idx
  on public.event_messages (campaign_id, created_at desc)
  where campaign_id is not null;

comment on column public.event_messages.campaign_id is
  'Idempotency key shared by every row from one dashboard bulk-send action.';
comment on column public.event_messages.message_note is
  'Optional host text for the update template. Never contains an invitation token.';

