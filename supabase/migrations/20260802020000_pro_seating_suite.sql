-- Pro seating suite: real tables, guest preferences and recoverable seating snapshots.
-- Everything runs inside the existing Supabase project and requires no paid external API.

create table public.event_seating_tables (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  name text not null,
  shape text not null default 'round',
  capacity integer not null default 10,
  zone text,
  notes text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint event_seating_tables_name_length check (char_length(trim(name)) between 1 and 80),
  constraint event_seating_tables_shape_allowed check (shape in ('round', 'rectangle', 'square', 'banquet')),
  constraint event_seating_tables_capacity_range check (capacity between 1 and 100),
  constraint event_seating_tables_zone_length check (zone is null or char_length(zone) <= 80),
  constraint event_seating_tables_notes_length check (notes is null or char_length(notes) <= 500),
  constraint event_seating_tables_sort_order_range check (sort_order between 0 and 10000),
  constraint event_seating_tables_event_name_unique unique (event_id, name)
);

create index event_seating_tables_event_sort_idx
  on public.event_seating_tables (event_id, sort_order, name);

alter table public.event_seating_tables enable row level security;

create policy event_seating_tables_owner_read on public.event_seating_tables
  for select to authenticated
  using (public.owns_event(event_id));

create policy event_seating_tables_owner_insert on public.event_seating_tables
  for insert to authenticated
  with check (public.owns_event(event_id));

create policy event_seating_tables_owner_update on public.event_seating_tables
  for update to authenticated
  using (public.owns_event(event_id))
  with check (public.owns_event(event_id));

create policy event_seating_tables_owner_delete on public.event_seating_tables
  for delete to authenticated
  using (public.owns_event(event_id));

alter table public.guests
  add column if not exists table_id uuid references public.event_seating_tables(id) on delete set null,
  add column if not exists seating_group text,
  add column if not exists meal_preference text,
  add column if not exists accessibility_needs text,
  add column if not exists seating_priority smallint not null default 0,
  add column if not exists seat_locked boolean not null default false;

alter table public.guests
  add constraint guests_seating_group_length
    check (seating_group is null or char_length(seating_group) <= 120),
  add constraint guests_meal_preference_length
    check (meal_preference is null or char_length(meal_preference) <= 120),
  add constraint guests_accessibility_needs_length
    check (accessibility_needs is null or char_length(accessibility_needs) <= 500),
  add constraint guests_seating_priority_range
    check (seating_priority between 0 and 10);

create index guests_event_table_idx on public.guests (event_id, table_id) where is_active = true;
create index guests_event_group_idx on public.guests (event_id, seating_group) where is_active = true;
create index guests_event_unseated_idx on public.guests (event_id, full_name)
  where is_active = true and table_id is null;

create or replace function public.validate_guest_seating_table_event()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.table_id is not null and not exists (
    select 1
    from public.event_seating_tables table_row
    where table_row.id = new.table_id
      and table_row.event_id = new.event_id
  ) then
    raise exception 'Seating table must belong to the same event';
  end if;
  return new;
end;
$$;

create trigger guests_validate_seating_table_event
  before insert or update of event_id, table_id on public.guests
  for each row execute function public.validate_guest_seating_table_event();

create table public.event_seating_snapshots (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  label text not null,
  layout jsonb not null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint event_seating_snapshots_label_length check (char_length(trim(label)) between 1 and 120),
  constraint event_seating_snapshots_layout_object check (jsonb_typeof(layout) = 'object')
);

create index event_seating_snapshots_event_created_idx
  on public.event_seating_snapshots (event_id, created_at desc);

alter table public.event_seating_snapshots enable row level security;

create policy event_seating_snapshots_owner_read on public.event_seating_snapshots
  for select to authenticated
  using (public.owns_event(event_id));

create policy event_seating_snapshots_owner_insert on public.event_seating_snapshots
  for insert to authenticated
  with check (public.owns_event(event_id) and created_by = auth.uid());

create policy event_seating_snapshots_owner_delete on public.event_seating_snapshots
  for delete to authenticated
  using (public.owns_event(event_id));

comment on table public.event_seating_tables is
  'Pro-plan physical seating tables, zones, shapes and capacities for one event.';
comment on table public.event_seating_snapshots is
  'Point-in-time seating layouts that let the event owner preserve and compare arrangements.';
comment on column public.guests.seat_locked is
  'When true, automatic seating keeps the guest on the currently selected table.';
