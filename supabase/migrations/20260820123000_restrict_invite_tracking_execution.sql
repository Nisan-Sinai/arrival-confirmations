-- Least-privilege fix for personal-invite tracking routines.
--
-- Supabase grants EXECUTE on newly-created functions directly to `authenticated`
-- through default privileges. The original migration revoked only from the PUBLIC
-- pseudo-role, which does not remove a grant made directly to a named role. These
-- routines are called exclusively by server-side code through the service-role
-- client after the invitation session/RSVP has already been validated. A signed-in
-- browser therefore has no legitimate reason to execute either SECURITY DEFINER
-- function directly.

revoke execute on function public.record_guest_invite_open(uuid, uuid, uuid)
  from public, anon, authenticated;
revoke execute on function public.record_guest_invite_response(uuid, uuid, public.attendance_status)
  from public, anon, authenticated;

grant execute on function public.record_guest_invite_open(uuid, uuid, uuid)
  to service_role;
grant execute on function public.record_guest_invite_response(uuid, uuid, public.attendance_status)
  to service_role;
