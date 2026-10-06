create schema if not exists testh; grant usage on schema testh to authenticated, anon;
create or replace function testh.as_user(u uuid) returns void language plpgsql as $$
begin perform set_config('request.jwt.claim.sub', u::text, false); execute 'set role authenticated'; end $$;
create or replace function testh.as_admin() returns void language plpgsql as $$
begin execute 'reset role'; perform set_config('request.jwt.claim.sub', '', false); end $$;
create or replace function testh.ok(label text, cond boolean) returns void language plpgsql as $$
begin if cond then raise notice 'PASS  %', label; else raise exception 'FAIL  %', label; end if; end $$;
-- Run sql expecting an error whose text contains `needle`.
create or replace function testh.fails(label text, stmt text, needle text) returns void language plpgsql as $$
begin
  begin execute stmt; exception when others then
    if sqlerrm ilike '%' || needle || '%' then raise notice 'PASS  % (%)', label, sqlerrm; return; end if;
    raise exception 'FAIL  % : wrong error: %', label, sqlerrm;
  end;
  raise exception 'FAIL  % : no error', label;
end $$;
create or replace function testh.n(stmt text) returns bigint language plpgsql as $$
declare c bigint; begin execute 'select count(*) from (' || stmt || ') q' into c; return c; end $$;


do $$
declare
  a uuid := '00000000-0000-0000-0000-00000000000a'; b uuid := '00000000-0000-0000-0000-00000000000b';
  c uuid := '00000000-0000-0000-0000-00000000000c'; d uuid := '00000000-0000-0000-0000-00000000000d';
  m uuid; plan uuid; i int; u uuid;
begin
  perform testh.as_admin();
  insert into auth.users (id) values (a), (b), (c), (d);
  insert into auth.users (id, raw_app_meta_data) values ('00000000-0000-0000-0000-0000000000ee', '{"is_seed": true}');
  perform testh.ok('sign-up trigger creates a bare profile', (select count(*) from public.profiles) = 5);
  perform testh.ok('is_seed comes from app_metadata', (select is_seed from public.profiles where id='00000000-0000-0000-0000-0000000000ee'));
  update public.profiles set onboarding_complete = true, first_name = 'x' where id in (a, b, c, d);

  -- anon gets nothing
  execute 'set role anon';
  perform testh.fails('anon cannot read profiles', 'select * from public.profiles', 'permission denied');
  perform testh.as_admin();

  -- profiles
  perform testh.as_user(a);
  perform testh.ok('A sees self + other finished profiles (not the unfinished seed)', testh.n('select 1 from public.profiles') = 4);
  perform testh.fails('cannot set is_seed', 'update public.profiles set is_seed = true where id = ''' || a || '''', 'permission denied');
  update public.profiles set first_name = 'Alice', gender='woman' where id = a;
  update public.profiles set first_name = 'Hacked' where id = b;
  perform testh.as_admin();
  perform testh.ok('A can edit self but not B', (select first_name from public.profiles where id=a)='Alice' and (select first_name from public.profiles where id=b)='x');
  perform testh.fails('under-18 birthdate rejected', 'update public.profiles set birthdate = current_date where id = ''' || a || '''', 'violates check');

  update public.profiles set paused = true where id = c;
  perform testh.as_user(a);
  perform testh.ok('paused profile hidden from others', testh.n('select 1 from public.profiles where id=''' || c || '''') = 0);
  perform testh.as_admin(); update public.profiles set paused = false where id = c;

  -- locations are private
  perform testh.as_user(a);
  insert into public.profile_locations (user_id, lat, lng) values (a, 37.7, -122.4);
  perform testh.fails('cannot write someone else''s location', 'insert into public.profile_locations values (''' || b || ''', 1, 1)', 'row-level security');
  perform testh.as_user(b);
  perform testh.ok('B cannot read A''s coordinates', testh.n('select 1 from public.profile_locations') = 0);

  -- pets / photos
  perform testh.as_user(a);
  insert into public.pets (id, owner_id, name, species, age_years, energy) values ('11111111-1111-1111-1111-111111111111', a, 'Biscuit', 'dog', 3, 'high');
  insert into public.photos (owner_id, pet_id, url) values (a, '11111111-1111-1111-1111-111111111111', 'http://x/p.jpg');
  perform testh.as_user(b);
  perform testh.ok('B can see A''s pet and photo', testh.n('select 1 from public.pets') = 1 and testh.n('select 1 from public.photos') = 1);
  perform testh.fails('B cannot put a photo on A''s pet', 'insert into public.photos (owner_id, pet_id, url) values (''' || b || ''', ''11111111-1111-1111-1111-111111111111'', ''u'')', 'row-level security');
  perform testh.fails('B cannot add a pet for A', 'insert into public.pets (owner_id, name, species, age_years, energy) values (''' || a || ''', ''n'', ''dog'', 1, ''low'')', 'row-level security');

  -- likes + match
  perform testh.as_user(a);
  insert into public.likes (from_user_id, to_user_id, target_type, target_id) values (a, b, 'photo', gen_random_uuid());
  perform testh.fails('cannot like as someone else', 'insert into public.likes (from_user_id, to_user_id, target_type, target_id) values (''' || b || ''', ''' || c || ''', ''photo'', gen_random_uuid())', 'row-level security');
  perform testh.fails('duplicate like rejected', 'insert into public.likes (from_user_id, to_user_id, target_type, target_id) values (''' || a || ''', ''' || b || ''', ''photo'', gen_random_uuid())', 'duplicate key');
  perform testh.ok('no match yet', testh.n('select 1 from public.matches') = 0);
  perform testh.as_user(b);
  perform testh.ok('B sees the incoming like', testh.n('select 1 from public.likes where to_user_id = ''' || b || '''') = 1);
  perform testh.fails('B cannot edit the like''s comment', 'update public.likes set comment = ''hi'' where to_user_id = ''' || b || '''', 'permission denied');
  insert into public.likes (from_user_id, to_user_id, target_type, target_id) values (b, a, 'pet', '11111111-1111-1111-1111-111111111111');
  perform testh.ok('mutual like creates exactly one match', testh.n('select 1 from public.matches') = 1);
  select id into m from public.matches;
  perform testh.as_user(c);
  perform testh.ok('C cannot see A/B''s match', testh.n('select 1 from public.matches') = 0);
  perform testh.fails('C cannot insert a match', 'insert into public.matches (user_a, user_b) values (''' || a || ''', ''' || c || ''')', 'permission denied');

  -- like back + remove
  perform testh.as_user(c);
  insert into public.likes (from_user_id, to_user_id, target_type, target_id) values (c, a, 'photo', gen_random_uuid());
  perform testh.as_user(a);
  perform public.like_back((select id from public.likes where from_user_id = c));
  perform testh.ok('like_back creates a match with C', testh.n('select 1 from public.matches') = 2);
  perform testh.fails('like_back on a like not addressed to you', 'select public.like_back((select id from public.likes where from_user_id = ''' || a || '''))', 'like_gone');
  perform testh.as_admin(); delete from public.matches where user_a = least(a, c) and user_b = greatest(a, c);
  perform testh.as_user(d);
  insert into public.likes (from_user_id, to_user_id, target_type, target_id) values (d, a, 'photo', gen_random_uuid());
  perform testh.as_user(a);
  update public.likes set removed_at = now() where from_user_id = d;
  perform testh.ok('removed like disappears from incoming', testh.n('select 1 from public.likes where to_user_id = ''' || a || ''' and from_user_id = ''' || d || ''' and removed_at is null') = 0);
  perform testh.as_user(d);
  insert into public.likes (from_user_id, to_user_id, target_type, target_id) values (d, a, 'photo', gen_random_uuid());
  perform testh.ok('a removed like can be sent again', true);

  -- quota
  perform testh.as_admin();
  for i in 1..9 loop u := gen_random_uuid(); insert into auth.users (id) values (u); update public.profiles set onboarding_complete = true where id = u; end loop;
  perform testh.as_user(b);
  for u in select id from public.profiles where id not in (a,b,c,d) and not is_seed limit 7 loop
    insert into public.likes (from_user_id, to_user_id, target_type, target_id) values (b, u, 'photo', gen_random_uuid());
  end loop; -- B already liked A: 8 total
  perform testh.fails('9th like of the day is refused', 'insert into public.likes (from_user_id, to_user_id, target_type, target_id) select ''' || b || ''', id, ''photo'', gen_random_uuid() from public.profiles where id not in (select to_user_id from public.likes where from_user_id = ''' || b || ''') and id <> ''' || b || ''' limit 1', 'like_quota_exceeded');
  insert into public.likes (from_user_id, to_user_id, target_type, target_id, is_treat) select b, id, 'photo', gen_random_uuid(), true from public.profiles where id not in (select to_user_id from public.likes where from_user_id = b) and id <> b limit 1;
  perform testh.ok('one Treat is allowed on top of 8 likes', true);
  perform testh.fails('second Treat is refused', 'insert into public.likes (from_user_id, to_user_id, target_type, target_id, is_treat) select ''' || b || ''', id, ''photo'', gen_random_uuid(), true from public.profiles where id not in (select to_user_id from public.likes where from_user_id = ''' || b || ''') and id <> ''' || b || ''' limit 1', 'treat_quota_exceeded');

  -- chat
  perform testh.as_user(a);
  insert into public.messages (match_id, sender_id, body) values (m, a, 'hello');
  perform testh.fails('cannot send as the other person', 'insert into public.messages (match_id, sender_id, body) values (''' || m || ''', ''' || b || ''', ''spoof'')', 'row-level security');
  perform testh.fails('cannot forge a date-plan card', 'insert into public.messages (match_id, sender_id, kind, date_plan_id) values (''' || m || ''', ''' || a || ''', ''date_plan'', gen_random_uuid())', 'row-level security');
  update public.messages set read_at = now() where match_id = m;
  perform testh.as_admin();
  perform testh.ok('sender cannot mark their own message read', (select read_at from public.messages where body='hello') is null);
  perform testh.as_user(b);
  update public.messages set read_at = now() where match_id = m;
  perform testh.as_admin();
  perform testh.ok('recipient can mark it read', (select read_at from public.messages where body='hello') is not null);
  perform testh.as_user(c);
  perform testh.ok('outsider cannot read the chat', testh.n('select 1 from public.messages') = 0);
  perform testh.fails('outsider cannot post in the chat', 'insert into public.messages (match_id, sender_id, body) values (''' || m || ''', ''' || c || ''', ''hi'')', 'row-level security');

  -- Play Dates
  perform testh.as_user(a);
  insert into public.date_plans (id, match_id, proposer_id, kind, location, starts_at) values ('22222222-2222-2222-2222-222222222222', m, a, 'dog_park', 'Meadow', now() + interval '2 days');
  perform testh.ok('a new plan posts its card in the chat', testh.n('select 1 from public.messages where kind = ''date_plan''') = 1);
  perform testh.as_user(b);
  update public.date_plans set status = 'accepted' where id = '22222222-2222-2222-2222-222222222222';
  perform testh.as_admin();
  perform testh.ok('other person can accept (recorded as them)', (select status = 'accepted' and responded_by_id = b from public.date_plans));
  perform testh.as_user(b);
  perform testh.fails('other person cannot change the place', 'update public.date_plans set location = ''Elsewhere'' where id = ''22222222-2222-2222-2222-222222222222''', 'only the person who planned');
  delete from public.date_plans where id = '22222222-2222-2222-2222-222222222222';
  perform testh.as_admin();
  perform testh.ok('other person cannot delete the plan', testh.n('select 1 from public.date_plans') = 1);
  perform testh.as_user(a);
  update public.date_plans set location = 'New spot' where id = '22222222-2222-2222-2222-222222222222';
  perform testh.as_admin();
  perform testh.ok('proposer edit resets it to proposed', (select status = 'proposed' and responded_by_id is null and location = 'New spot' from public.date_plans));
  perform testh.as_user(a);
  delete from public.date_plans where id = '22222222-2222-2222-2222-222222222222';
  perform testh.as_admin();
  perform testh.ok('proposer delete removes the plan and its chat card', testh.n('select 1 from public.date_plans') = 0 and testh.n('select 1 from public.messages where kind = ''date_plan''') = 0);

  -- blocking
  perform testh.as_user(a);
  insert into public.blocks (blocker_id, blocked_id) values (a, b);
  perform testh.as_admin();
  perform testh.ok('block removes the match and its messages', testh.n('select 1 from public.matches where id = ''' || m || '''') = 0 and testh.n('select 1 from public.messages where match_id = ''' || m || '''') = 0);
  perform testh.as_user(b);
  perform testh.ok('blocked person can no longer see the blocker', testh.n('select 1 from public.profiles where id = ''' || a || '''') = 0);
  perform testh.fails('and cannot like them', 'insert into public.likes (from_user_id, to_user_id, target_type, target_id) values (''' || b || ''', ''' || a || ''', ''photo'', gen_random_uuid())', 'blocked');

  -- reports are write-only
  perform testh.as_user(c);
  insert into public.reports (reporter_id, reported_id, reason) values (c, d, 'spam');
  perform testh.fails('reports cannot be read back', 'select * from public.reports', 'permission denied');

  -- account deletion
  perform testh.as_user(d);
  perform public.delete_my_account();
  perform testh.as_admin();
  perform testh.ok('delete_my_account removes the user and cascades', testh.n('select 1 from auth.users where id = ''' || d || '''') = 0 and testh.n('select 1 from public.profiles where id = ''' || d || '''') = 0);
  perform testh.fails('delete_my_account needs a signed-in user', 'select public.delete_my_account()', 'not_authenticated');
  raise notice 'ALL DONE';
end $$;

-- ---------------------------------------------------------------------------
-- discovery_distances + match_summaries
-- ---------------------------------------------------------------------------
do $$
declare
  x1 uuid := '10000000-0000-0000-0000-000000000001'; -- San Francisco, wants <= 25 mi
  x2 uuid := '10000000-0000-0000-0000-000000000002'; -- Oakland (~8 mi), 25 mi
  x3 uuid := '10000000-0000-0000-0000-000000000003'; -- San Jose (~42 mi), 100 mi: too far for x1
  x4 uuid := '10000000-0000-0000-0000-000000000004'; -- Daly City (~6 mi) but only wants 3 mi
  x5 uuid := '10000000-0000-0000-0000-000000000005'; -- paused, nearby
  x6 uuid := '10000000-0000-0000-0000-000000000006'; -- blocked by x1, nearby
  x7 uuid := '10000000-0000-0000-0000-000000000007'; -- not onboarded, nearby
  x8 uuid := '10000000-0000-0000-0000-000000000008'; -- no location at all
  ids uuid[]; rec record; m uuid; cnt int;
begin
  perform testh.as_admin();
  insert into auth.users (id) select unnest(array[x1,x2,x3,x4,x5,x6,x7,x8]);
  update public.profiles set onboarding_complete = true,
    preferences = '{"maxDistanceMiles": 25}'::jsonb
    where id in (x1, x2, x5, x6);
  update public.profiles set onboarding_complete = true, preferences = '{"maxDistanceMiles": 100}'::jsonb where id = x3;
  update public.profiles set onboarding_complete = true, preferences = '{"maxDistanceMiles": 3}'::jsonb where id = x4;
  update public.profiles set onboarding_complete = true, paused = true where id = x5;
  update public.profiles set onboarding_complete = true where id in (x8);
  insert into public.profile_locations (user_id, lat, lng) values
    (x1, 37.7749, -122.4194), (x2, 37.8044, -122.2712), (x3, 37.3382, -121.8863),
    (x4, 37.6879, -122.4702), (x5, 37.7800, -122.4100), (x6, 37.7760, -122.4180),
    (x7, 37.7790, -122.4150);
  insert into public.blocks (blocker_id, blocked_id) values (x1, x6);

  perform testh.as_user(x1);
  select array_agg(user_id) into ids from public.discovery_distances() where user_id::text like '10000000%';
  perform testh.ok('only people in range of BOTH, visible and unblocked are returned', ids = array[x2]);
  select distance_miles into rec from public.discovery_distances() where user_id = x2;
  perform testh.ok('distance is rounded UP to whole miles (Oakland is ~8.4)', rec.distance_miles = 9);
  perform testh.ok('result has no coordinate columns', (select count(*) from information_schema.columns where table_name = 'discovery_distances') = 0
    and (select pg_get_function_result('public.discovery_distances(int)'::regprocedure)) = 'TABLE(user_id uuid, distance_miles integer)');

  perform testh.as_user(x2);
  perform testh.ok('it is symmetric: Oakland sees SF at the same rounded distance',
    (select distance_miles from public.discovery_distances() where user_id = x1) = 9);

  perform testh.as_user(x8);
  perform testh.ok('someone with no stored location gets nothing', testh.n('select 1 from public.discovery_distances()') = 0);

  perform testh.as_user(x3);
  perform testh.ok('a 100-mile user is still not shown people who only want <= 25', testh.n('select 1 from public.discovery_distances() where user_id in (''' || x1 || ''', ''' || x2 || ''')') = 0);

  perform testh.as_user(x1);
  select count(*) into cnt from public.discovery_distances(1);
  perform testh.ok('p_limit is respected', cnt <= 1);

  execute 'set role anon';
  perform testh.fails('signed-out callers cannot call it', 'select * from public.discovery_distances()', 'permission denied');
  perform testh.as_admin();

  -- match_summaries
  insert into public.matches (user_a, user_b) values (least(x1, x2), greatest(x1, x2)) returning id into m;
  perform testh.as_user(x1);
  perform testh.ok('a match with no messages has no last message', (select last_message_id is null from public.match_summaries where match_id = m));
  perform testh.as_user(x2);
  insert into public.messages (match_id, sender_id, body, created_at) values (m, x2, 'first', now() - interval '1 minute');
  insert into public.messages (match_id, sender_id, body, created_at) values (m, x2, 'second', now());
  perform testh.as_user(x1);
  perform testh.ok('summary shows the LATEST message and who sent it',
    (select last_body = 'second' and last_sender_id = x2 from public.match_summaries where match_id = m));
  perform testh.as_user(x3);
  perform testh.ok('outsiders see no summaries (row-level security carries through the view)', testh.n('select 1 from public.match_summaries') = 0);
  execute 'set role anon';
  perform testh.fails('signed-out callers cannot read summaries', 'select * from public.match_summaries', 'permission denied');
  perform testh.as_admin();
  raise notice 'DISCOVERY DONE';
end $$;

-- ---------------------------------------------------------------------------
-- typing channel authorization (realtime.messages policies)
-- ---------------------------------------------------------------------------
do $$
declare
  p1 uuid := '20000000-0000-0000-0000-000000000001';
  p2 uuid := '20000000-0000-0000-0000-000000000002';
  p3 uuid := '20000000-0000-0000-0000-000000000003';
  m uuid;
  topic text;
begin
  perform testh.as_admin();
  insert into auth.users (id) select unnest(array[p1, p2, p3]);
  insert into public.matches (user_a, user_b) values (least(p1, p2), greatest(p1, p2)) returning id into m;
  topic := 'typing:' || m;

  perform testh.ok('helper accepts a participant on the right topic', private.can_use_typing_topic(topic, p1) and private.can_use_typing_topic(topic, p2));
  perform testh.ok('helper rejects an outsider', not private.can_use_typing_topic(topic, p3));
  perform testh.ok('helper rejects other topics and malformed names without erroring',
    not private.can_use_typing_topic('typing:not-a-uuid', p1)
    and not private.can_use_typing_topic('room-1', p1)
    and not private.can_use_typing_topic('typing:' || gen_random_uuid(), p1));

  -- The policies, as Realtime evaluates them: topic setting + the user's role/claims.
  perform set_config('realtime.topic', topic, false);
  perform testh.as_user(p1);
  insert into realtime.messages (topic, extension) values (topic, 'broadcast');
  perform testh.ok('participant can send on their typing channel', true);
  perform testh.ok('participant can receive on it', testh.n('select 1 from realtime.messages where extension = ''broadcast''') >= 1);

  perform testh.as_user(p3);
  perform testh.fails('outsider cannot send on it', 'insert into realtime.messages (topic, extension) values (''' || topic || ''', ''broadcast'')', 'row-level security');
  perform testh.ok('outsider cannot receive on it', testh.n('select 1 from realtime.messages') = 0);

  perform testh.as_user(p1);
  perform testh.fails('presence/other extensions are not allowed', 'insert into realtime.messages (topic, extension) values (''' || topic || ''', ''presence'')', 'row-level security');
  perform set_config('realtime.topic', 'typing:' || gen_random_uuid(), false);
  perform testh.fails('participant cannot use a different match''s channel', 'insert into realtime.messages (topic, extension) values (''x'', ''broadcast'')', 'row-level security');

  execute 'set role anon';
  perform testh.fails('signed-out callers get nothing', 'select * from realtime.messages', 'permission denied');
  perform testh.as_admin();
  raise notice 'TYPING DONE';
end $$;
