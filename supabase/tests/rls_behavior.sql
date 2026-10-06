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
