-- Fix 2: server-side "nearby people" so exact coordinates never reach clients.
--
-- BEFORE: the client ran profiles.select('*').eq('open_to_meet', true) for
-- everyone, downloading each live user's EXACT lat/lng (and email), then
-- filtered by distance in the browser. Any logged-in user could therefore read
-- the precise location of every live user — a stalking risk, and a direct
-- contradiction of the in-app promise "Location is never shared."
--
-- AFTER: this function does the distance / block / event-scope filtering on the
-- server and returns only a distance ROUNDED to the nearest 50m
-- (approx_distance_m) — never raw coordinates, never email. It also hides anyone
-- whose location is older than 15 minutes (stale "ghost" locations).
--
-- SECURITY DEFINER lets the function read the profiles table to compute
-- distances, but it is gated by auth.uid(): an anonymous caller has no `me` row,
-- so the join yields nothing and they get an empty result.

create or replace function public.nearby_people(radius_m int default 500)
returns table (
  id uuid,
  name text,
  age int,
  occupation text,
  interests text[],
  languages text[],
  photo_url text,
  bg text,
  pronouns text,
  ask_me_prompts text[],
  checked_in_at timestamptz,
  approx_distance_m int
)
language sql
security definer
set search_path = public
as $$
  with me as (
    select lat, lng, checked_in_event_id
    from profiles
    where id = auth.uid()
  )
  select
    p.id, p.name, p.age, p.occupation, p.interests, p.languages,
    p.photo_url, p.bg, p.pronouns, p.ask_me_prompts, p.checked_in_at,
    -- haversine distance, rounded to nearest 50m so exact position cannot be derived
    (round(
       (6371000 * 2 * asin(sqrt(
          power(sin(radians(p.lat - me.lat) / 2), 2) +
          cos(radians(me.lat)) * cos(radians(p.lat)) *
          power(sin(radians(p.lng - me.lng) / 2), 2)
       ))) / 50
     ) * 50)::int as approx_distance_m
  from profiles p, me
  where p.id <> auth.uid()
    and p.open_to_meet = true
    and p.lat is not null and p.lng is not null
    and me.lat is not null and me.lng is not null
    and p.location_updated_at > now() - interval '15 minutes'
    and (me.checked_in_event_id is null
         or p.checked_in_event_id = me.checked_in_event_id)
    and (6371000 * 2 * asin(sqrt(
          power(sin(radians(p.lat - me.lat) / 2), 2) +
          cos(radians(me.lat)) * cos(radians(p.lat)) *
          power(sin(radians(p.lng - me.lng) / 2), 2)
        ))) <= radius_m
    and not exists (
      select 1 from blocked_users b
      where (b.blocker_id = auth.uid() and b.blocked_id = p.id)
         or (b.blocker_id = p.id and b.blocked_id = auth.uid())
    );
$$;

-- Only logged-in users may call it; never anonymous.
revoke all on function public.nearby_people(int) from public, anon;
grant execute on function public.nearby_people(int) to authenticated;
