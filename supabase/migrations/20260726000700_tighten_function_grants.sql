-- Tightens EXECUTE privileges on every routine in `public` (§4.4, least privilege).
--
-- Why this migration exists: `revoke all on function ... from public` in the
-- previous migrations was not sufficient. Supabase ships default privileges that
-- grant EXECUTE on new functions in `public` directly to `anon`, `authenticated`
-- and `service_role`. A grant made to a named role is not removed by revoking from
-- the PUBLIC pseudo-role, so `is_admin()` and `is_owner()` remained callable by an
-- anonymous visitor. Verified against the live database before and after.
--
-- The exposure was limited — both return false when `auth.uid()` is NULL — but an
-- authorisation predicate that anyone may call is surface with no upside, and §4.4
-- is explicit that authorisation must not be reachable by untrusted callers.

-- Authorisation predicates: authenticated callers only. RLS policies invoke these
-- as part of policy evaluation, which does not depend on the caller's EXECUTE
-- privilege, so restricting them does not weaken the policies.
revoke execute on function public.is_admin() from anon;
revoke execute on function public.is_owner() from anon;

-- Trigger functions are invoked by the trigger machinery, never called directly.
-- PostgreSQL checks EXECUTE at CREATE TRIGGER time rather than at fire time, so the
-- triggers keep working with no grants at all.
revoke execute on function public.set_updated_at() from public, anon, authenticated;
revoke execute on function public.guard_last_owner() from public, anon, authenticated;

-- Stop the same thing happening to routines added by later migrations.
alter default privileges in schema public revoke execute on functions from anon;
