-- Track personal invitation issuance, opens and RSVP choices per guest.

alter table public.guests
  add column if not exists invite_link_issued_at timestamptz,
  add column if not exists invite_first_opened_at timestamptz,
  add column if not exists invite_last_opened_at timestamptz,
  add column if not exists invite_open_count integer not null default 0,
  add column if not exists invite_last_response_at timestamptz,
  add column if not exists invite_last_response_status public.attendance_status;

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

create or replace function public.record_guest_invite_open(
  p_guest_id uuid,
  p_event_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.guests
  set
    invite_first_opened_at = coalesce(invite_first_opened_at, now()),
    invite_last_opened_at = now(),
    invite_open_count = invite_open_count + 1
  where id = p_guest_id
    and event_id = p_event_id
    and is_active = true;
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

revoke all on function public.record_guest_invite_open(uuid, uuid) from public;
revoke all on function public.record_guest_invite_response(uuid, uuid, public.attendance_status) from public;
grant execute on function public.record_guest_invite_open(uuid, uuid) to service_role;
grant execute on function public.record_guest_invite_response(uuid, uuid, public.attendance_status) to service_role;

comment on column public.guests.invite_link_issued_at is
  'Last time a fresh personal invitation link was generated for this guest.';
comment on column public.guests.invite_first_opened_at is
  'First successful opening of a valid personal invitation link.';
comment on column public.guests.invite_last_opened_at is
  'Most recent successful opening of a valid personal invitation link.';
comment on column public.guests.invite_open_count is
  'Number of successful personal invitation opens across issued links.';
comment on column public.guests.invite_last_response_at is
  'Most recent RSVP submitted through the personal invitation flow.';
comment on column public.guests.invite_last_response_status is
  'Most recent attendance choice submitted through the personal invitation flow.';
