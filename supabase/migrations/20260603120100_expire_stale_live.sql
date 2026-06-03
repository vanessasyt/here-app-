-- Fix 3: automatically switch off discoverability for stale "live" users.
--
-- BEFORE: when a user went live and then simply closed the tab (no "go offline"
-- tap, no sign-out), their `open_to_meet` stayed true and their last coordinates
-- persisted forever. `location_updated_at` was written but never used, and the
-- auto-off timer only ran while the app was open. Result: people could keep
-- showing as "Active / nearby" at a place they left hours ago (e.g. their home).
--
-- AFTER: a scheduled job flips `open_to_meet` to false for anyone whose location
-- hasn't refreshed in 20 minutes. (Fix 2's nearby_people() already HIDES users
-- older than 15 minutes from view; this job also cleans up the underlying flag.)
--
-- Requires the pg_cron extension (available on Supabase). Safe to re-run.

create extension if not exists pg_cron;

-- Remove a previous definition if re-applying, so the schedule isn't duplicated.
select cron.unschedule('expire-stale-live')
where exists (select 1 from cron.job where jobname = 'expire-stale-live');

select cron.schedule(
  'expire-stale-live',
  '*/5 * * * *',   -- every 5 minutes
  $$
    update public.profiles
    set open_to_meet = false
    where open_to_meet = true
      and (location_updated_at is null
           or location_updated_at < now() - interval '20 minutes');
  $$
);
