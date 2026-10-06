-- Discover needs "how far away is each person" without ever revealing anyone's coordinates,
-- and the Matches list needs each match with its last message in one query.

-- ---------------------------------------------------------------------------
-- discovery_distances: who the caller may be shown, and roughly how far away they are.
--
-- Privacy design (this is the whole point of the function):
--   * Coordinates are never returned, only a distance rounded UP to whole miles.
--   * Only people who are visible (finished onboarding, not paused, not blocked either way) AND
--     within BOTH people's maximum distance are returned, so it can't be used to map out
--     everyone in a region.
--   * Capped at 500 rows per call.
-- Rounding limits, but doesn't eliminate, trilateration (someone moving their own pin and
-- re-asking). Rate-limiting location changes is a later hardening step.
--
-- Same great-circle formula and earth radius (3958.8 mi) as src/domain/geo.ts.
-- SECURITY DEFINER because it must read other people's private coordinates; it only ever
-- answers for auth.uid(), and signed-out callers get nothing.
-- ---------------------------------------------------------------------------
create function public.discovery_distances(p_limit int default 300)
returns table (user_id uuid, distance_miles int)
language sql
stable
security definer
set search_path = ''
as $$
  with me as (
    select
      loc.lat,
      loc.lng,
      coalesce((p.preferences ->> 'maxDistanceMiles')::numeric, 25) as max_miles
    from public.profile_locations loc
    join public.profiles p on p.id = loc.user_id
    where loc.user_id = auth.uid()
  ),
  measured as (
    select
      l.user_id,
      coalesce((p.preferences ->> 'maxDistanceMiles')::numeric, 25) as their_max_miles,
      me.max_miles as my_max_miles,
      2 * 3958.8 * asin(sqrt(least(1,
        power(sin(radians(l.lat - me.lat) / 2), 2)
        + cos(radians(me.lat)) * cos(radians(l.lat))
          * power(sin(radians(l.lng - me.lng) / 2), 2)
      ))) as miles
    from public.profile_locations l
    join public.profiles p on p.id = l.user_id
    cross join me
    where auth.uid() is not null
      and l.user_id <> auth.uid()
      and p.onboarding_complete
      and not p.paused
      and not private.is_blocked(l.user_id, auth.uid())
  )
  select m.user_id, greatest(1, ceil(m.miles))::int as distance_miles
  from measured m
  where m.miles <= m.my_max_miles and m.miles <= m.their_max_miles
  order by m.miles
  limit least(greatest(p_limit, 1), 500);
$$;
revoke execute on function public.discovery_distances(int) from public, anon;
grant execute on function public.discovery_distances(int) to authenticated;

-- ---------------------------------------------------------------------------
-- match_summaries: each of the caller's matches with its latest message (if any).
-- security_invoker = the caller's own row-level security applies, so people only ever see
-- their own matches and chats through it.
-- ---------------------------------------------------------------------------
create view public.match_summaries with (security_invoker = true) as
select
  m.id as match_id,
  m.user_a,
  m.user_b,
  m.created_at as matched_at,
  lm.id as last_message_id,
  lm.sender_id as last_sender_id,
  lm.kind as last_kind,
  lm.body as last_body,
  lm.date_plan_id as last_date_plan_id,
  lm.created_at as last_message_at,
  lm.read_at as last_read_at
from public.matches m
left join lateral (
  select * from public.messages
  where match_id = m.id
  order by created_at desc
  limit 1
) lm on true;

revoke all on public.match_summaries from anon, authenticated;
grant select on public.match_summaries to authenticated;
