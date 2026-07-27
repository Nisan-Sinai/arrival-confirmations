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

-- The two CHECK constraints this purge needs are widened in the migration immediately
-- before it (20260726001350). They lived here at first, which left the database holding
-- a migration name the repository did not — exactly the drift pnpm check:schema-drift
-- exists to catch, and the first thing it caught.
create or replace function public.purge_expired_guest_data(
  -- Defaults match ppConfig.defaultRetentionDaysAfterEvent and the sentence in the
  -- privacy notice. Every caller passes explicitly, but a default that disagreed with
  -- the published policy is a trap for whoever calls it without arguments one day.
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
