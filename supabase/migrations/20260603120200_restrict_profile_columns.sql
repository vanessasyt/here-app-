-- Fix 4: stop exposing private profile columns (email, exact coordinates).
--
-- BEFORE: clients read profiles with select('*'), which returned `email`, `lat`,
-- `lng` and `location_updated_at` for every profile they could see. Any logged-in
-- user could harvest every other user's email address and precise location.
--
-- AFTER: revoke blanket SELECT and grant SELECT only on the non-sensitive
-- columns. email / lat / lng / location_updated_at become unreadable through the
-- API for everyone — PostgREST can only return columns the role has SELECT on, so
-- even a hand-crafted select('*') can no longer return them.
--
-- INSERT/UPDATE column privileges are untouched, so onboarding (which writes
-- email) and the GPS heartbeat (which writes lat/lng) keep working. The
-- nearby_people() RPC from Fix 2 is SECURITY DEFINER and reads coordinates
-- internally, so it is unaffected by these grants.

revoke select on public.profiles from anon, authenticated;

grant select (
  id, name, age, occupation, interests, languages,
  photo_url, bg, pronouns, ask_me_prompts,
  open_to_meet, checked_in_event_id, checked_in_at
) on public.profiles to authenticated;
