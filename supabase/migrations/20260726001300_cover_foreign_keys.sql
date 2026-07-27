-- Covering indexes for two foreign keys that had none.
--
-- Reported by Supabase's performance linter (0001_unindexed_foreign_keys). Both are
-- currently harmless because the tables are near-empty, which is exactly why it is
-- worth doing now rather than after an event fills them.
--
-- The cost is not on SELECT. It is on DELETE of the *parent* row: without a covering
-- index Postgres sequentially scans the child table to enforce the constraint, and
-- both of these parents get deleted in bulk. `rsvps` is purged by the retention
-- process §14 describes, and `events` cascades to everything beneath it when a host
-- removes an event — at which point an unindexed `idempotency_keys.rsvp_id` turns one
-- delete into a full scan per row.
--
-- `if not exists` so this is safe to re-run against a database that already has them.

create index if not exists idempotency_keys_rsvp_id_idx
  on public.idempotency_keys (rsvp_id);

create index if not exists invite_sessions_event_id_idx
  on public.invite_sessions (event_id);

comment on index public.idempotency_keys_rsvp_id_idx is
  'Covers idempotency_keys_rsvp_id_fkey so purging an RSVP does not scan this table.';
comment on index public.invite_sessions_event_id_idx is
  'Covers invite_sessions_event_id_fkey so deleting an event does not scan this table.';
