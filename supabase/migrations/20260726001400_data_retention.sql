-- Retention and erasure (§14).
--
-- The privacy notice tells every guest, in writing, that their details are deleted or
-- anonymised within `defaultRetentionDaysAfterEvent` of the event and that audit rows
-- are kept no longer than a year. Until now nothing performed either — the promise was
-- published and unimplemented, which under חוק הגנת הפרטיות is worse than not having
-- made it. This is the implementation.
--
-- Anonymise rather than delete, for the RSVP rows specifically. A host looking back at
-- last year's simcha should still be able to see that ninety people came; what they
-- must not still have is who those people were or how to contact them. So the counts
-- and the status survive and every identifying column is cleared — which is exactly
-- what "נמחקים או עוברים אנונימיזציה" describes.
--
-- `guests` rows are deleted outright: a guest record is nothing but contact details
-- and a token, so there is no non-identifying residue worth keeping.

-- ── The constraints have to describe a purged row, not just a live one ──────────
--
-- Found by running the purge against a disposable event rather than by reading the
-- schema: `rsvps_full_name_length` demands two characters and
-- `rsvps_phone_normalized_e164` demands a valid Israeli number, so the erase aborted
-- on its first row. The constraints were written for the only lifecycle state the
-- table had at the time. There are two now — live and purged — and a CHECK that only
-- admits the first turns a legal obligation into a runtime error.
--
-- Both are widened by exactly one alternative each, so a *live* row is validated as
-- strictly as before. `phone_normalized` keeps its per-event UNIQUE index, which is
-- why the purged form embeds the row id instead of being a constant.

alter table public.rsvps drop constraint if exists rsvps_full_name_length;
alter table public.rsvps add constraint rsvps_full_name_length check (
  full_name = ''
  or (char_length(btrim(full_name)) >= 2 and char_length(btrim(full_name)) <= 120)
);

alter table public.rsvps drop constraint if exists rsvps_phone_normalized_e164;
alter table public.rsvps add constraint rsvps_phone_normalized_e164 check (
  phone_normalized ~ '^\+972[1-9][0-9]{7,8}$'
  or phone_normalized ~ '^purged:[0-9a-f-]{36}$'
);

comment on constraint rsvps_full_name_length on public.rsvps is
  'Two to 120 characters while the row is live; empty once §14 has anonymised it.';
comment on constraint rsvps_phone_normalized_e164 on public.rsvps is
  'Israeli E.164 while the row is live; purged:<uuid> once §14 has anonymised it. The id keeps rsvps_unique_phone_per_event satisfiable after a bulk erase.';

create or replace function public.purge_expired_guest_data(
  p_retention_days integer default 30,
  p_audit_retention_days integer default 365,
  -- Lets a caller see what would happen before it happens. §14 asks for a documented
  -- process, and a purge nobody can rehearse is one nobody will run.
  p_dry_run boolean default false
)
returns table (
  events_processed integer,
  rsvps_anonymised integer,
  guests_deleted integer,
  invite_sessions_deleted integer,
  idempotency_keys_deleted integer,
  audit_logs_deleted integer
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_cutoff date := (now() at time zone 'Asia/Jerusalem')::date - p_retention_days;
  v_expired uuid[];
  v_rsvps integer := 0;
  v_guests integer := 0;
  v_sessions integer := 0;
  v_keys integer := 0;
  v_audit integer := 0;
begin
  -- The event's own date in its own zone, never the server's. An event on the 4th is
  -- over on the 4th in Israel regardless of where this job happens to run.
  select coalesce(array_agg(e.id), '{}')
    into v_expired
    from public.events e
   where e.event_date < v_cutoff;

  if p_dry_run then
    return query
      select
        cardinality(v_expired),
        (select count(*)::integer from public.rsvps r
          where r.event_id = any(v_expired) and r.full_name <> ''),
        (select count(*)::integer from public.guests g where g.event_id = any(v_expired)),
        (select count(*)::integer from public.invite_sessions s where s.event_id = any(v_expired)),
        (select count(*)::integer from public.idempotency_keys k
          where k.rsvp_id in (select r.id from public.rsvps r where r.event_id = any(v_expired))),
        (select count(*)::integer from public.audit_logs a
          where a.created_at < now() - make_interval(days => p_audit_retention_days));
    return;
  end if;

  -- Children first: idempotency rows reference an RSVP, and an anonymised RSVP has no
  -- reason to keep a replay guard for a submission that can never be replayed.
  delete from public.idempotency_keys k
   where k.rsvp_id in (select r.id from public.rsvps r where r.event_id = any(v_expired));
  get diagnostics v_keys = row_count;

  delete from public.invite_sessions s where s.event_id = any(v_expired);
  get diagnostics v_sessions = row_count;

  delete from public.guests g where g.event_id = any(v_expired);
  get diagnostics v_guests = row_count;

  /*
   * Every column that identifies a person, cleared in one statement.
   *
   * `phone_normalized` is set to a per-row value rather than a constant: it carries a
   * UNIQUE constraint per event, so blanking every row to the same string would
   * collide on the second one and abort the whole purge. The id is already opaque.
   *
   * `full_name <> ''` makes this idempotent — a second run finds nothing left to do
   * rather than rewriting rows it already cleared.
   */
  update public.rsvps r
     set full_name = '',
         phone = '',
         phone_normalized = 'purged:' || r.id::text,
         dietary_requirements = null,
         notes = null,
         update_token_hash = null,
         update_token_expires_at = null
   where r.event_id = any(v_expired)
     and r.full_name <> '';
  get diagnostics v_rsvps = row_count;

  -- Audit history is retained on its own clock (§4.7) and holds no contact details,
  -- so it is trimmed by age rather than by event.
  delete from public.audit_logs a
   where a.created_at < now() - make_interval(days => p_audit_retention_days);
  get diagnostics v_audit = row_count;

  return query select
    cardinality(v_expired), v_rsvps, v_guests, v_sessions, v_keys, v_audit;
end;
$$;

comment on function public.purge_expired_guest_data(integer, integer, boolean) is
  'Erases guest PII once an event is past its retention window (§14). Anonymises rsvps in place so head counts survive, deletes guests outright, and trims audit_logs by age. service_role only.';

-- Nobody holding a browser may run this, dry run included: the counts alone would tell
-- an anonymous caller how many guests an event has.
revoke all on function public.purge_expired_guest_data(integer, integer, boolean)
  from public, anon, authenticated;
grant execute on function public.purge_expired_guest_data(integer, integer, boolean)
  to service_role;
