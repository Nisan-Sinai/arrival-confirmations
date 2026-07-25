-- Row Level Security (§4.1).
--
-- Two independent layers guard every table, because either one alone has a failure
-- mode: table GRANTs decide whether a role may touch the table at all, and RLS
-- policies decide which rows. Supabase grants `anon` and `authenticated` broad
-- default privileges on new tables in `public`, so the grants are revoked first and
-- handed back only where the access matrix in §4.1 actually calls for them.
--
-- The access matrix, restated as code:
--
--   anonymous visitor      → no table access at all; reads the active event only
--                            through public.get_public_event() (§4.6)
--   personal-link visitor  → no table access; everything via server endpoints
--                            holding an invite session (§4.2, §4.3)
--   authenticated non-admin→ own admin_profiles row (which will not exist), nothing else
--   verified admin         → full access to event data, read-only on audit logs
--   server privileged op   → service_role, which bypasses RLS by role attribute

alter table public.events enable row level security;
alter table public.events force row level security;
alter table public.guests enable row level security;
alter table public.guests force row level security;
alter table public.rsvps enable row level security;
alter table public.rsvps force row level security;
alter table public.admin_profiles enable row level security;
alter table public.admin_profiles force row level security;
alter table public.audit_logs enable row level security;
alter table public.audit_logs force row level security;
alter table public.idempotency_keys enable row level security;
alter table public.idempotency_keys force row level security;
alter table public.invite_sessions enable row level security;
alter table public.invite_sessions force row level security;

revoke all on public.events from anon, authenticated;
revoke all on public.guests from anon, authenticated;
revoke all on public.rsvps from anon, authenticated;
revoke all on public.admin_profiles from anon, authenticated;
revoke all on public.audit_logs from anon, authenticated;
revoke all on public.idempotency_keys from anon, authenticated;
revoke all on public.invite_sessions from anon, authenticated;

-- Admin-managed data. RLS narrows these to verified admins; `anon` gets nothing.
grant select, insert, update, delete on public.events to authenticated;
grant select, insert, update, delete on public.guests to authenticated;
grant select, insert, update, delete on public.rsvps to authenticated;
grant select, insert, update, delete on public.admin_profiles to authenticated;
-- §4.7: audit history is evidence. No client role may write or alter it.
grant select on public.audit_logs to authenticated;

-- idempotency_keys and invite_sessions intentionally receive no grant at all:
-- they are written only by server-side privileged operations (§4.1).

create policy events_admin_manage on public.events
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy guests_admin_manage on public.guests
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy rsvps_admin_manage on public.rsvps
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy audit_logs_admin_read on public.audit_logs
  for select to authenticated
  using (public.is_admin());

-- An authenticated user may confirm what they are, which is what the admin layout
-- checks on every request. It reveals nothing about anyone else.
create policy admin_profiles_read_own on public.admin_profiles
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy admin_profiles_admin_read on public.admin_profiles
  for select to authenticated
  using (public.is_admin());

-- §4.4 "Prevent self-promotion". There is deliberately no INSERT/UPDATE/DELETE
-- policy for ordinary users, so a non-owner cannot create a profile, cannot grant
-- itself a role, and cannot revoke anyone else's. Only an existing owner can, and
-- the last-owner trigger still applies on top of this.
create policy admin_profiles_owner_write on public.admin_profiles
  for insert to authenticated
  with check (public.is_owner());

create policy admin_profiles_owner_update on public.admin_profiles
  for update to authenticated
  using (public.is_owner())
  with check (public.is_owner());

create policy admin_profiles_owner_delete on public.admin_profiles
  for delete to authenticated
  using (public.is_owner());
