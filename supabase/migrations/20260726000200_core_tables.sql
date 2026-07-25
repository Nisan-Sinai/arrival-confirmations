-- Core schema (§3).
--
-- Naming note: the specification's data model was written for a brit mila and uses
-- `parents_names`, `child_display_name` and `brit_time`. The application supports
-- eleven event types (`config/eventTypes.ts`), so those three columns are named for
-- the role they play rather than for one ceremony: `hosts_names`,
-- `honoree_display_name`, `ceremony_time`. The human-readable label for each is
-- supplied by the event-type preset, so a wedding admin sees "שמות המשפחות" and a
-- brit admin sees "שמות ההורים" over the same column.

create table public.events (
  id uuid primary key default gen_random_uuid(),
  event_type public.event_type not null default 'other',
  title text not null,
  hosts_names text not null,
  honoree_display_name text not null,
  event_date date not null,
  ceremony_time time,
  reception_time time,
  venue_name text not null,
  address text not null,
  waze_url text,
  google_maps_url text,
  contact_phone text,
  description text,
  -- NULL means "use the event-type preset default" (§3, config/eventTypes.ts).
  side_a_label text,
  side_b_label text,
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint events_title_not_blank check (btrim(title) <> ''),
  constraint events_hosts_names_not_blank check (btrim(hosts_names) <> ''),
  constraint events_honoree_not_blank check (btrim(honoree_display_name) <> ''),
  constraint events_venue_not_blank check (btrim(venue_name) <> ''),
  constraint events_address_not_blank check (btrim(address) <> ''),
  -- Only ever rendered as links; anything else would be an open redirect vector.
  constraint events_waze_url_scheme check (waze_url is null or waze_url ~ '^https://'),
  constraint events_maps_url_scheme check (google_maps_url is null or google_maps_url ~ '^https://')
);

-- §4.6 speaks of "the active event" in the singular, and the public projection
-- returns exactly one row. Enforce that here rather than hoping the admin UI does.
create unique index events_single_active_idx
  on public.events ((true))
  where is_active;

comment on table public.events is
  'One row per celebration. Guest-facing values live here, not in config (§0).';

create table public.guests (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  full_name text not null,
  phone text not null,
  -- E.164, produced by the single normaliser in `lib/phone.ts` (§6).
  phone_normalized text not null,
  family_side public.family_side,
  -- SHA-256 of the raw token, peppered server-side. The raw token exists only in
  -- the link the host sends, never here (§4.2).
  invite_token_hash text unique,
  token_expires_at timestamptz,
  token_revoked_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint guests_full_name_length check (char_length(btrim(full_name)) between 2 and 120),
  constraint guests_phone_normalized_e164 check (phone_normalized ~ '^\+972[1-9][0-9]{7,8}$'),
  -- A hash without an expiry would be a token that never dies (§4.2).
  constraint guests_token_has_expiry check (
    (invite_token_hash is null and token_expires_at is null)
    or (invite_token_hash is not null and token_expires_at is not null)
  ),
  constraint guests_unique_phone_per_event unique (event_id, phone_normalized)
);

comment on column public.guests.invite_token_hash is
  'SHA-256 of the peppered raw invite token. Never exposed to any client (§4.2).';

create table public.rsvps (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  -- Kept when the guest row is removed so the head-count stays correct.
  guest_id uuid references public.guests (id) on delete set null,
  full_name text not null,
  phone text not null,
  phone_normalized text not null,
  family_side public.family_side,
  attendance_status public.attendance_status not null,
  adults_count integer not null default 0,
  children_count integer not null default 0,
  babies_count integer not null default 0,
  dietary_requirements text,
  notes text,
  consent boolean not null,
  source public.rsvp_source not null,
  -- §6.4: the only credential that lets an unauthenticated visitor edit an RSVP.
  update_token_hash text unique,
  update_token_expires_at timestamptz,
  submitted_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint rsvps_full_name_length check (char_length(btrim(full_name)) between 2 and 120),
  constraint rsvps_phone_normalized_e164 check (phone_normalized ~ '^\+972[1-9][0-9]{7,8}$'),
  -- §3: mirrored by `appConfig.maxAttendeesPerCategory` so the client shows the
  -- same limit the database enforces.
  constraint rsvps_adults_range check (adults_count >= 0 and adults_count <= 30),
  constraint rsvps_children_range check (children_count >= 0 and children_count <= 30),
  constraint rsvps_babies_range check (babies_count >= 0 and babies_count <= 30),
  -- A declined RSVP that also books eight seats is a data-entry bug, not a choice.
  constraint rsvps_not_attending_has_no_seats check (
    attendance_status <> 'not_attending'
    or (adults_count = 0 and children_count = 0 and babies_count = 0)
  ),
  constraint rsvps_dietary_length check (dietary_requirements is null or char_length(dietary_requirements) <= 500),
  constraint rsvps_notes_length check (notes is null or char_length(notes) <= 1000),
  -- §6.1: an RSVP cannot be stored without the consent that legitimised storing it.
  constraint rsvps_consent_given check (consent),
  constraint rsvps_update_token_has_expiry check (
    (update_token_hash is null and update_token_expires_at is null)
    or (update_token_hash is not null and update_token_expires_at is not null)
  ),
  -- §3 and §6.4: duplicate prevention only. This is NOT an authorisation mechanism.
  constraint rsvps_unique_phone_per_event unique (event_id, phone_normalized)
);

comment on constraint rsvps_unique_phone_per_event on public.rsvps is
  'Prevents duplicate rows. Never treat as authorisation — see §6.4.';

create table public.admin_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users (id) on delete cascade,
  role public.admin_role not null default 'admin',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.admin_profiles is
  'Authorisation source of truth for is_admin() (§4.4). No self-service writes.';

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  admin_user_id uuid references auth.users (id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  -- §4.7: never raw tokens, passwords, cookies, full request bodies or raw IPs.
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),

  constraint audit_logs_action_not_blank check (btrim(action) <> ''),
  constraint audit_logs_entity_type_not_blank check (btrim(entity_type) <> '')
);

create table public.idempotency_keys (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  -- §6.3: the raw key never lands here.
  idempotency_key_hash text not null,
  request_fingerprint text not null,
  response_status integer not null,
  response_payload jsonb not null,
  rsvp_id uuid references public.rsvps (id) on delete set null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,

  constraint idempotency_status_range check (response_status between 100 and 599),
  constraint idempotency_expires_after_creation check (expires_at > created_at),
  constraint idempotency_unique_key_per_event unique (event_id, idempotency_key_hash)
);

create table public.invite_sessions (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  guest_id uuid not null references public.guests (id) on delete cascade,
  session_token_hash text not null unique,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  revoked_at timestamptz,

  constraint invite_sessions_expires_after_creation check (expires_at > created_at)
);

comment on table public.invite_sessions is
  'Short-lived, purpose-limited sessions created by the §4.3 token exchange. Bound to one event and one guest.';
