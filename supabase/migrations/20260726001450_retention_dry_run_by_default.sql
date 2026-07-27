-- Two corrections to the retention purge, both found by using it (§14).
--
-- 1. `p_dry_run` now defaults to TRUE. It defaulted to false, and the author of the
--    previous migration then ran `select purge_expired_guest_data()` to check something
--    unrelated — a real purge against the live database. It erased nothing only because
--    no event was past the window yet. A destructive routine whose safe mode requires a
--    flag gets run destructively by accident exactly once. The scheduled job in
--    20260726001500 passes false explicitly; everybody else now has to mean it.
--
-- 2. `p_retention_days` defaults to 365, matching `appConfig.defaultRetentionDaysAfterEvent`
--    and the sentence a guest reads in the privacy notice. A default that disagreed with
--    the published policy is a trap for whoever calls this without arguments.
--
-- The body is unchanged from 20260726001400; Postgres has no way to alter a default in
-- place, so the whole routine is re-created.

create or replace function public.purge_expired_guest_data(
  p_retention_days integer default 365,
  p_audit_retention_days integer default 365,
  p_dry_run boolean default true
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
  select coalesce(array_agg(e.id), '{}') into v_expired
    from public.events e where e.event_date < v_cutoff;

  if p_dry_run then
    return query select
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

  delete from public.idempotency_keys k
   where k.rsvp_id in (select r.id from public.rsvps r where r.event_id = any(v_expired));
  get diagnostics v_keys = row_count;

  delete from public.invite_sessions s where s.event_id = any(v_expired);
  get diagnostics v_sessions = row_count;

  delete from public.guests g where g.event_id = any(v_expired);
  get diagnostics v_guests = row_count;

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

  delete from public.audit_logs a
   where a.created_at < now() - make_interval(days => p_audit_retention_days);
  get diagnostics v_audit = row_count;

  return query select
    cardinality(v_expired), v_rsvps, v_guests, v_sessions, v_keys, v_audit;
end;
$$;

revoke all on function public.purge_expired_guest_data(integer, integer, boolean)
  from public, anon, authenticated;
grant execute on function public.purge_expired_guest_data(integer, integer, boolean)
  to service_role;
