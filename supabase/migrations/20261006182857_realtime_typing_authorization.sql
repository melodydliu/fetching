-- Typing indicators travel over Realtime Broadcast on a private channel per match, named
--   typing:<match id>
-- Only the two people in that match may join it (receive) or send on it.
-- (Row-level security is already on for realtime.messages; managing policies on it is allowed.
-- Clients must open the channel with { private: true }, and "Allow public access" should be
-- off in the project's Realtime settings so nothing can bypass these policies.)

-- Is `topic` a typing channel for a match this user is in? Returns false (never errors) for
-- any other topic, so a malformed name can't break the policy.
create function private.can_use_typing_topic(topic text, uid uuid) returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if topic !~ '^typing:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    return false;
  end if;
  return exists (
    select 1 from public.matches
    where id = substr(topic, 8)::uuid and (user_a = uid or user_b = uid)
  );
end;
$$;
revoke execute on function private.can_use_typing_topic(text, uuid) from public, anon;
grant execute on function private.can_use_typing_topic(text, uuid) to authenticated;

create policy "typing: match participants can receive"
  on realtime.messages
  for select
  to authenticated
  using (
    realtime.messages.extension = 'broadcast'
    and private.can_use_typing_topic((select realtime.topic()), (select auth.uid()))
  );

create policy "typing: match participants can send"
  on realtime.messages
  for insert
  to authenticated
  with check (
    realtime.messages.extension = 'broadcast'
    and private.can_use_typing_topic((select realtime.topic()), (select auth.uid()))
  );
