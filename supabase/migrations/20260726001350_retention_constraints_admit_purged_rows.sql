-- The CHECK constraints have to describe a purged row, not just a live one (§14).
--
-- Found by running the purge against a disposable event rather than by reading the
-- schema: `rsvps_full_name_length` demands two characters and
-- `rsvps_phone_normalized_e164` demands a valid Israeli number, so the erase aborted on
-- its first row. Both constraints were written when the table had only one lifecycle
-- state. There are two now — live and purged — and a CHECK that admits only the first
-- turns a legal obligation into a runtime error.
--
-- Each is widened by exactly one alternative, so a *live* row is validated as strictly
-- as before. `phone_normalized` keeps its per-event UNIQUE index, which is why the
-- purged form embeds the row id instead of being a constant: a bulk erase would
-- otherwise collide on the second row it touched.
--
-- Split out of 20260726001400 into its own file so the repository and the database
-- agree on the same set of migration names — `pnpm check:schema-drift` compares them,
-- and it was this file's absence that it caught first.

alter table public.rsvps drop constraint if exists rsvps_full_name_length;
alter table public.rsvps add constraint rsvps_full_name_length check (
  full_name = ''
  or (char_length(btrim(full_name)) >= 2 and char_length(btrim(full_name)) <= 120)
);

alter table public.rsvps drop constraint if exists rsvps_phone_normalized_e164;
alter table public.rsvps add constraint rsvps_phone_normalized_e164 check (
  phone_normalized ~ '^\+972[1-9][0-9]{7,8}$'
  or phone_normalized ~ '^purged:[0-9a-f-]{36}$'
);

comment on constraint rsvps_full_name_length on public.rsvps is
  'Two to 120 characters while the row is live; empty once §14 has anonymised it.';
comment on constraint rsvps_phone_normalized_e164 on public.rsvps is
  'Israeli E.164 while the row is live; purged:<uuid> once §14 has anonymised it. The id keeps rsvps_unique_phone_per_event satisfiable after a bulk erase.';
