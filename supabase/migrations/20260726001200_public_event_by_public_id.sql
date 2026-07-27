-- The public projection, addressed by `public_id` (§4.2, §4.6).
--
-- RECONSTRUCTED MIGRATION. The live project carries this function; the repository did
-- not, while `repositories/eventRepository.ts` has called it since the multi-tenant
-- change. A database provisioned from `supabase/migrations/` alone had no
-- `get_public_event_by_public_id`, so every invitation page threw. Worse, it kept
-- `get_public_event()` from 000600, which is not merely obsolete but unsafe once more
-- than one event can be live: it returns *some* active event to any anonymous caller,
-- with no public_id required. That hands a stranger's hosts, honoree, venue, address
-- and contact number to anyone who posts to /rest/v1/rpc/get_public_event.
--
-- So this migration does two things, and the second matters as much as the first:
-- it adds the addressed projection, and it removes the unaddressed one.

create type public.public_event_v2 as (
  id uuid,
  -- Present in the projection where `public_event` had no equivalent: the invitation
  -- needs to build its own share link, and re-deriving it client-side from the URL
  -- would break the moment the route changes.
  public_id text,
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

comment on type public.public_event_v2 is
  'The complete set of event columns an anonymous visitor may see (§4.6). Adding a column to `events` cannot widen this — the type would have to change too, which is the point.';

/**
 * One published event, addressed by its unguessable public id.
 *
 * SECURITY DEFINER because `anon` holds no privilege on `public.events` at all
 * (000500 revokes it); this routine is the entire anonymous read surface.
 * `search_path = ''` so a caller-controlled path cannot redirect `public.events`,
 * hence the fully qualified name.
 *
 * `and e.is_active` is inside the function rather than in the caller: an unpublished
 * event and a nonexistent one must be indistinguishable from outside, and a filter in
 * application code is one refactor away from being dropped.
 */
create or replace function public.get_public_event_by_public_id(p_public_id text)
returns public.public_event_v2
language sql
stable
security definer
set search_path = ''
as $$
  select (
    e.id, e.public_id, e.event_type, e.title, e.hosts_names, e.honoree_display_name,
    e.event_date, e.ceremony_time, e.reception_time, e.venue_name, e.address,
    e.waze_url, e.google_maps_url, e.contact_phone, e.description,
    e.side_a_label, e.side_b_label
  )::public.public_event_v2
    from public.events e
   where e.public_id = p_public_id
     and e.is_active
   limit 1;
$$;

comment on function public.get_public_event_by_public_id(text) is
  'The only route by which an anonymous visitor reads event data (§4.6). Requires the unguessable public_id, so holding one invitation link reveals nothing about any other event.';

revoke all on function public.get_public_event_by_public_id(text) from public;
grant execute on function public.get_public_event_by_public_id(text) to anon, authenticated;

-- The single-tenant projection, retired. Dropped rather than left in place: with
-- many events live it is a cross-tenant read, and an unused function that still
-- carries `grant execute ... to anon` is reachable whether or not anything calls it.
drop function if exists public.get_public_event();
drop type if exists public.public_event;
