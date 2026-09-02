-- Widen the public projection by exactly one column: the gift link.
--
-- `public_event_v2` is an allowlist, and its own comment says so: adding a column to
-- `events` cannot widen it, the type has to change too. This is that deliberate act.
--
-- The gift link belongs on the *public* invitation and not only on a personal one,
-- because the flow that actually gets used is a single shared link. Production says so
-- plainly: the brit mila took six replies through the public form against one guest row,
-- so no personal link was ever issued. A gift link visible only on personal invitations
-- would have been invisible at the only real event this product has had.
--
-- Nothing here is sensitive. It is a payment page the host published themselves, on an
-- invitation reachable only by holding its unguessable public_id.

-- Appended last, so every existing position in the composite is untouched — the function
-- below builds the tuple positionally and a column inserted in the middle would silently
-- shift every field after it. `cascade` carries the change into the dependent function's
-- return type, which is then rebuilt so the two cannot disagree.
alter type public.public_event_v2 add attribute gift_url text cascade;

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
    e.side_a_label, e.side_b_label, e.gift_url
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
