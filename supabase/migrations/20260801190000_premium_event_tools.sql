-- Premium event tools: spreadsheet import, WhatsApp reminders, branding and seating.

alter table public.events
  add column if not exists brand_primary_color text not null default '#5B3A29',
  add column if not exists brand_accent_color text not null default '#B58B4A',
  add column if not exists brand_logo_url text,
  add column if not exists invitation_style text not null default 'classic',
  add column if not exists whatsapp_template_name text not null default 'event_invitation_he',
  add column if not exists whatsapp_language_code text not null default 'he';

alter table public.events
  add constraint events_brand_primary_color_shape
    check (brand_primary_color ~ '^#[0-9A-Fa-f]{6}$'),
  add constraint events_brand_accent_color_shape
    check (brand_accent_color ~ '^#[0-9A-Fa-f]{6}$'),
  add constraint events_brand_logo_url_https
    check (brand_logo_url is null or brand_logo_url ~ '^https://'),
  add constraint events_invitation_style_allowed
    check (invitation_style in ('classic', 'modern', 'minimal')),
  add constraint events_whatsapp_template_name_shape
    check (whatsapp_template_name ~ '^[a-z0-9_]{1,128}$'),
  add constraint events_whatsapp_language_code_shape
    check (whatsapp_language_code ~ '^[a-z]{2}(_[A-Z]{2})?$');

alter table public.guests
  add column if not exists email text,
  add column if not exists party_size integer not null default 1,
  add column if not exists table_name text,
  add column if not exists seat_number text,
  add column if not exists import_source text,
  add column if not exists notes text;

alter table public.guests
  add constraint guests_email_shape
    check (email is null or email ~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'),
  add constraint guests_party_size_range check (party_size between 1 and 50),
  add constraint guests_import_source_allowed
    check (import_source is null or import_source in ('manual', 'csv', 'xlsx'));

create table if not exists public.event_messages (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  guest_id uuid references public.guests(id) on delete cascade,
  recipient_phone text not null,
  message_kind text not null,
  template_name text not null,
  language_code text not null default 'he',
  scheduled_for timestamptz not null,
  status text not null default 'pending',
  provider_message_id text,
  error_message text,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint event_messages_phone_shape check (recipient_phone ~ '^\+972[0-9]{8,9}$'),
  constraint event_messages_kind_allowed check (message_kind in ('invitation', 'reminder')),
  constraint event_messages_status_allowed check (status in ('pending', 'processing', 'sent', 'failed', 'cancelled')),
  constraint event_messages_template_shape check (template_name ~ '^[a-z0-9_]{1,128}$'),
  constraint event_messages_language_shape check (language_code ~ '^[a-z]{2}(_[A-Z]{2})?$')
);

create index if not exists event_messages_due_idx
  on public.event_messages (status, scheduled_for)
  where status = 'pending';
create index if not exists event_messages_event_idx
  on public.event_messages (event_id, created_at desc);

alter table public.event_messages enable row level security;

create policy event_messages_owner_read on public.event_messages
  for select to authenticated
  using (public.owns_event(event_id));

create policy event_messages_owner_insert on public.event_messages
  for insert to authenticated
  with check (public.owns_event(event_id));

create policy event_messages_owner_update on public.event_messages
  for update to authenticated
  using (public.owns_event(event_id))
  with check (public.owns_event(event_id));

-- Public branding is deliberately exposed through a fixed JSON shape rather than by
-- granting anonymous SELECT on events. Unpublished events return null, just like the
-- existing public-event RPC.
create or replace function public.get_public_event_branding(p_public_id text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'primary_color', e.brand_primary_color,
    'accent_color', e.brand_accent_color,
    'logo_url', e.brand_logo_url,
    'invitation_style', e.invitation_style
  )
  from public.events e
  where e.public_id = p_public_id
    and e.is_active = true
  limit 1;
$$;

revoke all on function public.get_public_event_branding(text) from public;
grant execute on function public.get_public_event_branding(text) to anon, authenticated;

comment on table public.event_messages is
  'WhatsApp Cloud API queue. Hosts may schedule messages; only the privileged cron sender processes them.';
comment on function public.get_public_event_branding(text) is
  'Returns the fixed public branding shape for one published invitation.';
