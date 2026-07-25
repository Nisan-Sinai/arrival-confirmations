-- Enumerated domains and the shared trigger helper (§3).
--
-- Every enum here has a mirror in TypeScript. `event_type` mirrors
-- `config/eventTypes.ts`; the others mirror `schemas/`. Adding a value is a
-- migration, never a UI edit (§3 "MIGRATIONS ONLY").

create type public.event_type as enum (
  'brit_mila',
  'britah',
  'pidyon_haben',
  'upsherin',
  'bar_mitzvah',
  'bat_mitzvah',
  'engagement',
  'henna',
  'wedding',
  'birthday',
  'other'
);

create type public.attendance_status as enum (
  'attending',
  'not_attending',
  'maybe'
);

create type public.rsvp_source as enum (
  'personal_link',
  'public_form'
);

-- Deliberately neutral rather than "groom side" / "bride side": the human-readable
-- label for each side is per-event and per-event-type, and lives in
-- `events.side_a_label` / `events.side_b_label`. Encoding the label in the enum
-- would make a wedding and a brit need different enums for the same concept.
create type public.family_side as enum (
  'side_a',
  'side_b',
  'other'
);

create type public.admin_role as enum (
  'admin',
  'owner'
);

-- Keeps `updated_at` honest without trusting any client to send it (§3).
-- `search_path = ''` is set on every function in this schema so that a malicious
-- search_path cannot redirect a call to an attacker-controlled object.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

comment on function public.set_updated_at() is
  'BEFORE UPDATE trigger: stamps updated_at server-side (§3).';
