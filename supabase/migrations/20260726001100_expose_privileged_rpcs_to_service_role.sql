-- Restore EXECUTE on the privileged routines to `service_role` (§4.1, §4.5).
--
-- RECONSTRUCTED MIGRATION. The live project carries these grants; the repository did
-- not. Provisioning a database from `supabase/migrations/` therefore produced a
-- schema on which `submit_rsvp` and `consume_rate_limit` were callable by nobody at
-- all, and every RSVP failed with "permission denied for function" — a defect that a
-- deploy to a fresh project would have hit on its first guest.
--
-- The cause is the order of the three earlier migrations. `revoke all ... from
-- public` in 000800 and 000900 strips the PUBLIC grant, and `service_role` holds no
-- grant of its own — it is a superuser-ish role in Supabase's model but PostgREST
-- still checks function privileges before dispatching an RPC. The grants below are
-- the missing half of those revokes, not a relaxation of them: anon and authenticated
-- remain revoked, which is the property those migrations exist to establish.

grant execute on function public.consume_rate_limit(text, integer, integer) to service_role;
grant execute on function public.purge_expired_rate_limits() to service_role;

grant execute on function public.submit_rsvp(
  uuid, uuid, text, text, text, public.family_side, public.attendance_status,
  integer, integer, integer, text, text, boolean, public.rsvp_source,
  text, text, text, text, integer, integer
) to service_role;

comment on function public.consume_rate_limit(text, integer, integer) is
  'Rate-limit gate for the public RSVP form (§6.1). service_role only — the browser must never be able to inspect or advance a bucket.';
