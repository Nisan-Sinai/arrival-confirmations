-- Indexes and updated_at triggers (§3).
--
-- Every index below backs a query the application actually makes; the dashboard
-- filters and the token lookups are the two hot paths.

-- Guest list and dashboard filters are always scoped to one event.
create index guests_event_id_idx on public.guests (event_id);
create index guests_phone_normalized_idx on public.guests (phone_normalized);
-- Only rows that can still be looked up need to be in the token index.
create index guests_invite_token_hash_idx
  on public.guests (invite_token_hash)
  where invite_token_hash is not null and token_revoked_at is null;
create index guests_token_expires_at_idx
  on public.guests (token_expires_at)
  where token_expires_at is not null;

create index rsvps_event_id_idx on public.rsvps (event_id);
create index rsvps_phone_normalized_idx on public.rsvps (phone_normalized);
create index rsvps_submitted_at_idx on public.rsvps (submitted_at desc);
create index rsvps_attendance_status_idx on public.rsvps (attendance_status);
create index rsvps_guest_id_idx on public.rsvps (guest_id) where guest_id is not null;
create index rsvps_update_token_hash_idx
  on public.rsvps (update_token_hash)
  where update_token_hash is not null;
-- The response-rate and per-day charts group by event and day (§8.1).
create index rsvps_event_submitted_idx on public.rsvps (event_id, submitted_at desc);

create index audit_logs_created_at_idx on public.audit_logs (created_at desc);
create index audit_logs_entity_idx on public.audit_logs (entity_type, entity_id);
create index audit_logs_admin_user_idx
  on public.audit_logs (admin_user_id)
  where admin_user_id is not null;

-- Both cleanup paths (§3, §14) scan by expiry.
create index idempotency_keys_expires_at_idx on public.idempotency_keys (expires_at);
create index invite_sessions_expires_at_idx on public.invite_sessions (expires_at);
create index invite_sessions_guest_id_idx on public.invite_sessions (guest_id);
-- Session validation only ever asks about live sessions.
create index invite_sessions_live_idx
  on public.invite_sessions (session_token_hash)
  where revoked_at is null;

create trigger events_set_updated_at
  before update on public.events
  for each row execute function public.set_updated_at();

create trigger guests_set_updated_at
  before update on public.guests
  for each row execute function public.set_updated_at();

create trigger rsvps_set_updated_at
  before update on public.rsvps
  for each row execute function public.set_updated_at();

create trigger admin_profiles_set_updated_at
  before update on public.admin_profiles
  for each row execute function public.set_updated_at();
