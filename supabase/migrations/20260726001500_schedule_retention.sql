-- Runs the §14 purge without anybody remembering to (§14, §15).
--
-- `purge_expired_guest_data()` existed and worked, and nothing called it. A retention
-- policy that depends on a person running a script every month is not a retention
-- policy — it is a promise with a manual step, and the privacy notice makes that
-- promise to every guest in writing.
--
-- pg_cron rather than a Vercel cron or a GitHub Action, for three reasons that all
-- point the same way: it needs no service-role key held outside the database, it cannot
-- be missed because a deployment was paused, and it costs nothing on the free tier the
-- whole product is built around. The job is one statement against a function that is
-- already idempotent, so a double run is a no-op rather than a hazard.

create extension if not exists pg_cron;

-- Unschedule first so re-running this migration reschedules rather than duplicating.
do $$
begin
  perform cron.unschedule('purge-expired-guest-data');
exception
  when others then null;  -- no such job yet
end
$$;

/*
 * 03:15 UTC daily — a little after the hour, because every scheduler on earth is busy
 * exactly on it. That is 05:15 or 06:15 in Israel depending on the season, which is
 * the quietest part of the day for a product whose traffic is people opening
 * invitations in the evening.
 *
 * Daily rather than monthly: the window is a property of the event date, not of the
 * calendar, so checking every day means a guest's details are erased within a day of
 * becoming due instead of up to a month late.
 */
-- 365 days after the event, matching `appConfig.defaultRetentionDaysAfterEvent` and the
-- sentence in the privacy notice. Those three have to agree, and the notice is the one
-- a guest reads — so if this number ever changes, it changes there first.
select cron.schedule(
  'purge-expired-guest-data',
  '15 3 * * *',
  $$select public.purge_expired_guest_data(365, 365, false)$$
);

comment on extension pg_cron is
  'Scheduler for the §14 retention purge. See supabase/migrations/20260726001500_schedule_retention.sql.';
