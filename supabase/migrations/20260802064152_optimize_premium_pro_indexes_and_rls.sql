-- Foreign-key covering indexes for the Premium and Pro tables.
--
-- Written down after the fact. This migration ran against the live project on
-- 2026-08-02 and was never committed, so `check:schema-drift` reported it as applied
-- but absent from the repository — the exact failure the drift check was built to
-- catch, and the second time it has caught it.
--
-- The three indexes below are what production actually has that a clean provision from
-- this directory did not. All three cover a foreign key. Postgres indexes a primary key
-- automatically but never the *referencing* side, so without these every cascade from a
-- deleted guest, table or admin degrades to a sequential scan of the child table — and
-- deleting a guest is not a rare administrative act here, it is what happens when a
-- family drops off the list.
--
-- The file name carries the version the live project recorded (20260802064152) rather
-- than today's, so the ordering in `schema_migrations` still reads as what happened.
--
-- `if not exists` throughout: production already has all three, and this file has to be
-- a no-op there while still creating them on a clean database.

create index if not exists event_messages_guest_id_idx
  on public.event_messages (guest_id);

create index if not exists event_seating_snapshots_created_by_idx
  on public.event_seating_snapshots (created_by);

create index if not exists guests_table_id_idx
  on public.guests (table_id);

-- No RLS statements, despite the name the live project recorded.
--
-- Every policy in `pg_policies` on the production database is named in a migration in
-- this directory, and so is every function in `public`. Whatever the RLS half of this
-- migration did, it left nothing behind that a clean provision does not already
-- produce. Writing speculative policy changes here to match a name would be inventing
-- history; the indexes are what is demonstrably missing, and they are what this
-- restores.
