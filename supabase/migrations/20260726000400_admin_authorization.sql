-- Admin authorisation (§4.4).
--
-- `is_admin()` is the single source of truth every RLS policy consults. It is
-- SECURITY DEFINER so that a caller who cannot read `admin_profiles` can still be
-- checked against it, and `search_path = ''` so a caller-controlled search_path
-- cannot redirect any of the objects it names — hence the fully qualified
-- references throughout.

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
      from public.admin_profiles ap
     where ap.user_id = (select auth.uid())
       and ap.is_active
       and ap.role in ('admin'::public.admin_role, 'owner'::public.admin_role)
  );
$$;

comment on function public.is_admin() is
  'True when the current Supabase user has an active admin/owner profile (§4.4). Fixed search_path.';

-- Owner-only operations (role changes, removing another admin) need a stricter test.
create or replace function public.is_owner()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
      from public.admin_profiles ap
     where ap.user_id = (select auth.uid())
       and ap.is_active
       and ap.role = 'owner'::public.admin_role
  );
$$;

comment on function public.is_owner() is
  'True when the current Supabase user is an active owner (§4.4).';

revoke all on function public.is_admin() from public;
revoke all on function public.is_owner() from public;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_owner() to authenticated;

-- §4.4 "Prevent: removal of the final owner". RLS blocks the browser from reaching
-- admin_profiles at all, but a service-role script or a psql session bypasses RLS —
-- so the invariant is enforced by a trigger, where nothing can route around it.
create or replace function public.guard_last_owner()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  remaining_owners integer;
begin
  -- Only a change that removes owner status can violate the invariant.
  if tg_op = 'UPDATE'
     and old.role = 'owner'::public.admin_role
     and new.role = 'owner'::public.admin_role
     and new.is_active then
    return new;
  end if;

  if tg_op = 'UPDATE' and old.role <> 'owner'::public.admin_role then
    return new;
  end if;

  if tg_op = 'DELETE' and old.role <> 'owner'::public.admin_role then
    return old;
  end if;

  select count(*)
    into remaining_owners
    from public.admin_profiles ap
   where ap.role = 'owner'::public.admin_role
     and ap.is_active
     and ap.id <> old.id;

  if remaining_owners = 0 then
    -- English on purpose: this message surfaces in psql and CI logs, never to a guest.
    raise exception 'Cannot remove the last active owner; promote another owner first'
      using errcode = 'raise_exception';
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

create trigger admin_profiles_guard_last_owner
  before update or delete on public.admin_profiles
  for each row execute function public.guard_last_owner();

comment on function public.guard_last_owner() is
  'Refuses the update or delete that would leave the system with no active owner (§4.4).';
