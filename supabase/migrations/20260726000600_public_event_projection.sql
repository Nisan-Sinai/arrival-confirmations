-- The safe public projection of the active event (§4.6).
--
-- §4.6 offers three shapes and warns that a view can quietly bypass the intended
-- RLS model. This uses the option it lists first — a restricted routine with
-- explicit permissions — because the column list is then *inside* the contract:
-- adding a column to `events` cannot widen what an anonymous visitor sees, since
-- the function's return type would have to change too. A `select *` view has the
-- opposite property, which is exactly the leak the leakage test in §10.6 looks for.
--
-- Note what is absent from the return type: `id` is included because the RSVP form
-- must scope its submission to an event, but `created_at`, `updated_at`,
-- `is_active` and anything added later are not.

create type public.public_event as (
  id uuid,
  event_type public.event_type,
  title text,
  hosts_names text,
  honoree_display_name text,
  event_date date,
  ceremony_time time,
  reception_time time,
  venue_name text,
  address text,
  waze_url text,
  google_maps_url text,
  contact_phone text,
  description text,
  side_a_label text,
  side_b_label text
);

create or replace function public.get_public_event()
returns public.public_event
language sql
stable
security definer
set search_path = ''
as $$
  select (
    e.id,
    e.event_type,
    e.title,
    e.hosts_names,
    e.honoree_display_name,
    e.event_date,
    e.ceremony_time,
    e.reception_time,
    e.venue_name,
    e.address,
    e.waze_url,
    e.google_maps_url,
    e.contact_phone,
    e.description,
    e.side_a_label,
    e.side_b_label
  )::public.public_event
    from public.events e
   where e.is_active
   limit 1;
$$;

comment on function public.get_public_event() is
  'The only route by which an anonymous visitor reads event data (§4.6). Returns a fixed column list for the single active event, or NULL when none is active.';

revoke all on function public.get_public_event() from public;
grant execute on function public.get_public_event() to anon, authenticated;
