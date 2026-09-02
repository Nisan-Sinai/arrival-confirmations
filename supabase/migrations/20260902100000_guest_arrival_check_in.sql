-- Arrival check-in: who actually walked through the door.
--
-- An RSVP is a promise made weeks ahead. On the night the host needs the other number —
-- who is here — and until now the product had no place to record it. The caterer asks at
-- eight o'clock, and the honest answer was a printed list and a pen.
--
-- Deliberately one nullable column and nothing else:
--
--   * `null` means "not marked", not "absent". A host who never opens the screen has an
--     event full of nulls rather than an event full of no-shows, and nothing downstream
--     reads it as a refusal.
--   * No default and no backfill, so applying this to a live project is a catalogue
--     change and not a table rewrite. The 2,700 rows already in production are untouched.
--   * No new policy. `guests_owner_manage` from 20260726001000 already governs every
--     column on this table for the event's owner, and adding a second policy for one
--     column would be a second thing to keep in step with the first.
--
-- `if not exists` because this file has to be a no-op against a project where it has
-- already run, which is the state the drift check exists to keep true.

alter table public.guests
  add column if not exists checked_in_at timestamptz;

comment on column public.guests.checked_in_at is
  'When the guest was marked as arrived, in UTC. Null means unmarked, never absent.';

-- Partial, because the only question ever asked of this column is "who is already here",
-- and on the night that is a small fraction of a large list. Indexing the nulls would be
-- indexing the answer nobody queries for.
create index if not exists guests_event_checked_in_idx
  on public.guests (event_id, checked_in_at)
  where checked_in_at is not null;
