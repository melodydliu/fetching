-- Rules a client must not be trusted to enforce. They run as triggers/functions inside the
-- database, so a modified app can't skip them.
-- Error messages here are a contract with the app (it maps them to friendly errors):
--   like_quota_exceeded | treat_quota_exceeded | blocked | like_gone

-- Same numbers as src/config/index.ts (dailyLikeLimit / dailyTreatLimit).
-- Days reset at midnight UTC for now; per-user time zones can come later.
create function private.daily_like_limit() returns int
language sql immutable as $$ select 8 $$;
create function private.daily_treat_limit() returns int
language sql immutable as $$ select 1 $$;

-- ---------------------------------------------------------------------------
-- Before a like is saved: not blocked, and within today's limits.
-- Treats are counted separately from regular likes (a Treat doesn't spend a like).
-- ---------------------------------------------------------------------------
create function private.enforce_like_rules() returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  day_start timestamptz := date_trunc('day', now() at time zone 'utc') at time zone 'utc';
  sent_today int;
begin
  if private.is_blocked(new.from_user_id, new.to_user_id) then
    raise exception 'blocked' using errcode = 'P0001';
  end if;

  select count(*) into sent_today
  from public.likes
  where from_user_id = new.from_user_id
    and is_treat = new.is_treat
    and created_at >= day_start;

  if new.is_treat and sent_today >= private.daily_treat_limit() then
    raise exception 'treat_quota_exceeded' using errcode = 'P0001';
  elsif not new.is_treat and sent_today >= private.daily_like_limit() then
    raise exception 'like_quota_exceeded' using errcode = 'P0001';
  end if;

  return new;
end;
$$;
revoke execute on function private.enforce_like_rules() from public, anon, authenticated;

create trigger likes_enforce_rules
  before insert on public.likes
  for each row execute function private.enforce_like_rules();

-- ---------------------------------------------------------------------------
-- After a like is saved: if they already liked you, it's a match.
-- ---------------------------------------------------------------------------
create function private.create_match_on_mutual_like() returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (
    select 1 from public.likes
    where from_user_id = new.to_user_id
      and to_user_id = new.from_user_id
      and removed_at is null
  ) then
    insert into public.matches (user_a, user_b)
    values (least(new.from_user_id, new.to_user_id), greatest(new.from_user_id, new.to_user_id))
    on conflict (user_a, user_b) do nothing;
  end if;
  return new;
end;
$$;
revoke execute on function private.create_match_on_mutual_like() from public, anon, authenticated;

create trigger likes_create_match
  after insert on public.likes
  for each row execute function private.create_match_on_mutual_like();

-- ---------------------------------------------------------------------------
-- Like back (from Likes You): always matches, never spends a daily like.
-- Callable by signed-in users only; checks that the like really is addressed to the caller.
-- ---------------------------------------------------------------------------
create function public.like_back(p_like_id uuid) returns public.matches
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  the_like public.likes;
  result public.matches;
begin
  if me is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  select * into the_like from public.likes
  where id = p_like_id and to_user_id = me and removed_at is null;
  if not found then
    raise exception 'like_gone' using errcode = 'P0001';
  end if;
  if private.is_blocked(me, the_like.from_user_id) then
    raise exception 'blocked' using errcode = 'P0001';
  end if;

  insert into public.matches (user_a, user_b)
  values (least(me, the_like.from_user_id), greatest(me, the_like.from_user_id))
  on conflict (user_a, user_b) do nothing;

  select * into result from public.matches
  where user_a = least(me, the_like.from_user_id)
    and user_b = greatest(me, the_like.from_user_id);
  return result;
end;
$$;
revoke execute on function public.like_back(uuid) from public, anon;
grant execute on function public.like_back(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Blocking removes the match (and with it the chat and Play Dates).
-- ---------------------------------------------------------------------------
create function private.remove_match_on_block() returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.matches
  where user_a = least(new.blocker_id, new.blocked_id)
    and user_b = greatest(new.blocker_id, new.blocked_id);
  return new;
end;
$$;
revoke execute on function private.remove_match_on_block() from public, anon, authenticated;

create trigger blocks_remove_match
  after insert on public.blocks
  for each row execute function private.remove_match_on_block();

-- ---------------------------------------------------------------------------
-- Play Dates: a new plan drops its card into the chat.
-- ---------------------------------------------------------------------------
create function private.post_date_plan_message() returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.messages (match_id, sender_id, kind, date_plan_id)
  values (new.match_id, new.proposer_id, 'date_plan', new.id);
  return new;
end;
$$;
revoke execute on function private.post_date_plan_message() from public, anon, authenticated;

create trigger date_plans_post_message
  after insert on public.date_plans
  for each row execute function private.post_date_plan_message();

-- Who may change what on a plan (same rules as src/domain/datePlans.ts):
--   * ids, match, proposer and creation time never change;
--   * the proposer edits the details, which sends it back to "proposed";
--   * the other person only answers (status, responded_by_id, and a note / new time when
--     suggesting a change), and always as themselves.
create function private.guard_date_plan_update() returns trigger
language plpgsql
set search_path = ''
as $$
declare
  me uuid := auth.uid();
begin
  if new.id <> old.id or new.match_id <> old.match_id
     or new.proposer_id <> old.proposer_id or new.created_at <> old.created_at then
    raise exception 'date plan identity is fixed';
  end if;

  if me = old.proposer_id then
    new.status := 'proposed';
    new.responded_by_id := null;
  else
    if new.kind <> old.kind
       or new.custom_label is distinct from old.custom_label
       or new.location is distinct from old.location then
      raise exception 'only the person who planned it can edit the details';
    end if;
    if new.status = 'proposed' then
      raise exception 'answer with accepted, declined or change_suggested';
    end if;
    if new.status <> 'change_suggested' and new.starts_at <> old.starts_at then
      raise exception 'only a suggested change can move the time';
    end if;
    new.responded_by_id := me;
  end if;
  return new;
end;
$$;
revoke execute on function private.guard_date_plan_update() from public, anon, authenticated;

create trigger date_plans_guard_update
  before update on public.date_plans
  for each row execute function private.guard_date_plan_update();

-- ---------------------------------------------------------------------------
-- Delete my account: removes the auth user; everything else cascades from profiles.
-- (The app removes the user's Storage files first. See the storage migration.)
-- ---------------------------------------------------------------------------
create function public.delete_my_account() returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;
  delete from auth.users where id = auth.uid();
end;
$$;
revoke execute on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;

-- ---------------------------------------------------------------------------
-- Realtime: new messages and Play Date status changes stream to the people in the match.
-- Realtime applies the messages / date_plans read policies, so only participants receive them.
-- ---------------------------------------------------------------------------
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.date_plans;
