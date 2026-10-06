-- Who can read and change what.
-- Rules of thumb used below:
--   * Everything is scoped to the signed-in user: (select auth.uid()).
--   * `anon` (not signed in) gets nothing.
--   * Tables that clients should only change in controlled ways (matches, reports)
--     have no write policies; the next migration adds triggers/functions for those.
--   * Column-level grants stop users editing columns they must not (is_seed, ids, ...).

-- ---------------------------------------------------------------------------
-- helpers (private schema: usable inside policies, not callable through the API)
-- ---------------------------------------------------------------------------
grant usage on schema private to authenticated;

create function private.is_blocked(a uuid, b uuid) returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.blocks
    where (blocker_id = a and blocked_id = b) or (blocker_id = b and blocked_id = a)
  );
$$;

create function private.is_matched(a uuid, b uuid) returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.matches
    where user_a = least(a, b) and user_b = greatest(a, b)
  );
$$;

create function private.in_match(p_match_id uuid, p_user_id uuid) returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.matches
    where id = p_match_id and (user_a = p_user_id or user_b = p_user_id)
  );
$$;

revoke execute on function private.is_blocked(uuid, uuid) from public, anon;
revoke execute on function private.is_matched(uuid, uuid) from public, anon;
revoke execute on function private.in_match(uuid, uuid) from public, anon;
grant execute on function private.is_blocked(uuid, uuid) to authenticated;
grant execute on function private.is_matched(uuid, uuid) to authenticated;
grant execute on function private.in_match(uuid, uuid) to authenticated;

-- Start from nothing, then grant exactly what the app needs.
revoke all on all tables in schema public from anon, authenticated;

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
grant select on public.profiles to authenticated;
-- No insert (the sign-up trigger creates the row) and no delete (see delete_my_account).
grant update (
  kind, first_name, birthdate, gender, interested_in, city, relationship_goals, job, hometown,
  allergies, loved_species, open_to_pet_species, preferences, dealbreakers, notifications,
  paused, onboarding_complete, onboarding_steps, last_active_at
) on public.profiles to authenticated;

-- You always see yourself. Others see you only if you finished onboarding and aren't paused
-- (or you're matched), and neither of you has blocked the other.
create policy "profiles: read self or visible people" on public.profiles
  for select to authenticated
  using (
    id = (select auth.uid())
    or (
      not private.is_blocked(id, (select auth.uid()))
      and (
        (onboarding_complete and not paused)
        or private.is_matched(id, (select auth.uid()))
      )
    )
  );

create policy "profiles: update self" on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- profile_locations: owner only (see core migration for why)
-- ---------------------------------------------------------------------------
grant select, insert, update on public.profile_locations to authenticated;

create policy "locations: read own" on public.profile_locations
  for select to authenticated using (user_id = (select auth.uid()));
create policy "locations: insert own" on public.profile_locations
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "locations: update own" on public.profile_locations
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- pets, photos, prompt answers: owner writes; readable by anyone who can see the owner.
-- The EXISTS runs through the profiles policy above, so blocks and pauses carry over.
-- ---------------------------------------------------------------------------
grant select, insert, update, delete on public.pets to authenticated;
grant select, insert, update, delete on public.photos to authenticated;
grant select, insert, update, delete on public.prompt_answers to authenticated;

create policy "pets: read if owner visible" on public.pets
  for select to authenticated
  using (exists (select 1 from public.profiles p where p.id = pets.owner_id));
create policy "pets: insert own" on public.pets
  for insert to authenticated with check (owner_id = (select auth.uid()));
create policy "pets: update own" on public.pets
  for update to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));
create policy "pets: delete own" on public.pets
  for delete to authenticated using (owner_id = (select auth.uid()));

create policy "photos: read if owner visible" on public.photos
  for select to authenticated
  using (exists (select 1 from public.profiles p where p.id = photos.owner_id));
-- A pet photo may only be attached to one of your own pets.
create policy "photos: insert own" on public.photos
  for insert to authenticated
  with check (
    owner_id = (select auth.uid())
    and (
      pet_id is null
      or exists (
        select 1 from public.pets
        where pets.id = photos.pet_id and pets.owner_id = (select auth.uid())
      )
    )
  );
create policy "photos: update own" on public.photos
  for update to authenticated
  using (owner_id = (select auth.uid()))
  with check (
    owner_id = (select auth.uid())
    and (
      pet_id is null
      or exists (
        select 1 from public.pets
        where pets.id = photos.pet_id and pets.owner_id = (select auth.uid())
      )
    )
  );
create policy "photos: delete own" on public.photos
  for delete to authenticated using (owner_id = (select auth.uid()));

create policy "prompt answers: read if owner visible" on public.prompt_answers
  for select to authenticated
  using (exists (select 1 from public.profiles p where p.id = prompt_answers.user_id));
create policy "prompt answers: insert own" on public.prompt_answers
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "prompt answers: update own" on public.prompt_answers
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy "prompt answers: delete own" on public.prompt_answers
  for delete to authenticated using (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- likes: send as yourself; the recipient can see incoming ones and remove them.
-- Daily limits, "no like after a block" and match creation are triggers (next migration).
-- ---------------------------------------------------------------------------
grant select, insert on public.likes to authenticated;
grant update (removed_at) on public.likes to authenticated;

-- The recipient keeps seeing likes they removed (the app filters on removed_at is null):
-- Postgres requires an updated row to still be readable by the person updating it.
create policy "likes: read sent and incoming" on public.likes
  for select to authenticated
  using (from_user_id = (select auth.uid()) or to_user_id = (select auth.uid()));
create policy "likes: send as self" on public.likes
  for insert to authenticated
  with check (from_user_id = (select auth.uid()) and removed_at is null);
-- Recipient may only set removed_at (column grant above); every other column is frozen.
create policy "likes: recipient removes" on public.likes
  for update to authenticated
  using (to_user_id = (select auth.uid()))
  with check (to_user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- passes, blocks: your own rows only
-- ---------------------------------------------------------------------------
grant select, insert, delete on public.passes to authenticated;
create policy "passes: read own" on public.passes
  for select to authenticated using (viewer_id = (select auth.uid()));
create policy "passes: insert own" on public.passes
  for insert to authenticated with check (viewer_id = (select auth.uid()));
create policy "passes: delete own" on public.passes
  for delete to authenticated using (viewer_id = (select auth.uid()));

grant select, insert, delete on public.blocks to authenticated;
create policy "blocks: read own" on public.blocks
  for select to authenticated using (blocker_id = (select auth.uid()));
create policy "blocks: insert own" on public.blocks
  for insert to authenticated with check (blocker_id = (select auth.uid()));
create policy "blocks: delete own" on public.blocks
  for delete to authenticated using (blocker_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- matches: participants read and unmatch. Rows are created only by the like triggers.
-- ---------------------------------------------------------------------------
grant select, delete on public.matches to authenticated;
create policy "matches: read as participant" on public.matches
  for select to authenticated
  using (user_a = (select auth.uid()) or user_b = (select auth.uid()));
create policy "matches: unmatch as participant" on public.matches
  for delete to authenticated
  using (user_a = (select auth.uid()) or user_b = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- messages: participants read and send; only the recipient can mark read.
-- Date-plan cards are created by a trigger when a plan is inserted.
-- ---------------------------------------------------------------------------
grant select, insert on public.messages to authenticated;
grant update (read_at) on public.messages to authenticated;

create policy "messages: read in my matches" on public.messages
  for select to authenticated
  using (private.in_match(match_id, (select auth.uid())));
create policy "messages: send text in my matches" on public.messages
  for insert to authenticated
  with check (
    sender_id = (select auth.uid())
    and kind = 'text'
    and private.in_match(match_id, (select auth.uid()))
  );
create policy "messages: recipient marks read" on public.messages
  for update to authenticated
  using (sender_id <> (select auth.uid()) and private.in_match(match_id, (select auth.uid())))
  with check (sender_id <> (select auth.uid()) and private.in_match(match_id, (select auth.uid())));

-- ---------------------------------------------------------------------------
-- date_plans: either person in the match can read and answer; the proposer creates/deletes.
-- (Which fields each person may change is enforced by a trigger in the next migration.)
-- ---------------------------------------------------------------------------
grant select, insert, update, delete on public.date_plans to authenticated;

create policy "date plans: read in my matches" on public.date_plans
  for select to authenticated
  using (private.in_match(match_id, (select auth.uid())));
create policy "date plans: propose as self" on public.date_plans
  for insert to authenticated
  with check (
    proposer_id = (select auth.uid())
    and private.in_match(match_id, (select auth.uid()))
  );
create policy "date plans: update in my matches" on public.date_plans
  for update to authenticated
  using (private.in_match(match_id, (select auth.uid())))
  with check (private.in_match(match_id, (select auth.uid())));
create policy "date plans: proposer deletes" on public.date_plans
  for delete to authenticated
  using (proposer_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- reports: write-only for users. Nobody reads them through the API; moderators use the
-- dashboard / service role.
-- ---------------------------------------------------------------------------
grant insert on public.reports to authenticated;
create policy "reports: file as self" on public.reports
  for insert to authenticated with check (reporter_id = (select auth.uid()));
