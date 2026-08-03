-- Track personal invitation issuance, real browser opens and RSVP choices per guest.

alter table public.guests
  add column if not exists invite_link_issued_at timestamptz,
  add column if not exists invite_first_opened_at timestamptz,
  add column if not exists invite_last_opened_at timestamptz,
  add column if not exists invite_open_count integer not null default 0,
  add column if not exists invite_last_response_at timestamptz,
  add column if not exists invite_last_response_status public.attendance_status;

alter table public.invite_sessions
  add column if not exists opened_at timestamptz;

alter table public.guests
  drop constraint if exists guests_invite_open_count_non_negative;

alter table public.guests
  add constraint guests_invite_open_count_non_negative
    check (invite_open_count >= 0);

create index if not exists guests_event_invite_tracking_idx
  on public.guests (
    event_id,
    invite_last_response_status,
    invite_last_opened_at desc nulls last
  )
  where is_active = true;

create index if not exists invite_sessions_unopened_idx
  on public.invite_sessions (id, guest_id, event_id)
  where opened_at is null;

-- Preserve personal-link answers that were submitted before tracking was introduced.
with latest_personal_response as (
  select distinct on (event_id, guest_id)
    event_id,
    guest_id,
    attendance_status,
    updated_at
  from public.rsvps
  where source = 'personal_link'
    and guest_id is not null
  order by event_id, guest_id, updated_at desc
)
update public.guests as guest
set
  invite_last_response_at = response.updated_at,
  invite_last_response_status = response.attendance_status
from latest_personal_response as response
where guest.id = response.guest_id
  and guest.event_id = response.event_id
  and guest.invite_last_response_at is null;

create or replace function public.record_guest_invite_open(
  p_session_id uuid,
  p_guest_id uuid,
  p_event_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_recorded boolean := false;
begin
  update public.invite_sessions
  set opened_at = now()
  where id = p_session_id
    and guest_id = p_guest_id
    and event_id = p_event_id
    and opened_at is null
    and revoked_at is null
    and expires_at > now();

  if found then
    update public.guests
    set
      invite_first_opened_at = coalesce(invite_first_opened_at, now()),
      invite_last_opened_at = now(),
      invite_open_count = invite_open_count + 1
    where id = p_guest_id
      and event_id = p_event_id
      and is_active = true;

    v_recorded := found;
  end if;

  return v_recorded;
end;
$$;

create or replace function public.record_guest_invite_response(
  p_guest_id uuid,
  p_event_id uuid,
  p_status public.attendance_status
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.guests
  set
    invite_last_response_at = now(),
    invite_last_response_status = p_status
  where id = p_guest_id
    and event_id = p_event_id
    and is_active = true;
end;
$$;

revoke all on function public.record_guest_invite_open(uuid, uuid, uuid) from public;
revoke all on function public.record_guest_invite_response(uuid, uuid, public.attendance_status) from public;
grant execute on function public.record_guest_invite_open(uuid, uuid, uuid) to service_role;
grant execute on function public.record_guest_invite_response(uuid, uuid, public.attendance_status) to service_role;

comment on column public.guests.invite_link_issued_at is
  'Last time a fresh personal invitation link was generated for this guest.';
comment on column public.guests.invite_first_opened_at is
  'First browser-confirmed opening of a valid personal invitation link.';
comment on column public.guests.invite_last_opened_at is
  'Most recent browser-confirmed opening of a valid personal invitation link.';
comment on column public.guests.invite_open_count is
  'Number of browser-confirmed personal invitation opens across issued links.';
comment on column public.guests.invite_last_response_at is
  'Most recent RSVP submitted through the personal invitation flow.';
comment on column public.guests.invite_last_response_status is
  'Most recent attendance choice submitted through the personal invitation flow.';
comment on column public.invite_sessions.opened_at is
  'Set once by the browser after the personal invitation page renders; link-preview crawlers do not count as opens.';
