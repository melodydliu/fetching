-- Core tables for Fetching. Mirrors src/domain/types.ts.
-- Row-level security and grants are in the next migration; nothing here is reachable
-- from the API until then (RLS is enabled below, with no policies = deny all).

-- Helpers and trigger functions live here, which is NOT exposed through the API.
create schema if not exists private;
revoke all on schema private from public, anon;

-- ---------------------------------------------------------------------------
-- profiles: one row per auth user (created automatically on sign-up, see bottom)
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  kind text not null default 'animal_lover' check (kind in ('pet_owner', 'animal_lover')),
  first_name text not null default '' check (char_length(first_name) <= 50),
  -- Nullable: a bare account exists before onboarding collects these.
  birthdate date check (birthdate is null or birthdate <= (current_date - interval '18 years')::date),
  gender text check (gender in ('woman', 'man', 'nonbinary')),
  interested_in text[] not null default '{}',
  city text check (char_length(city) <= 100),
  relationship_goals text[] not null default '{}',
  job text check (char_length(job) <= 100),
  hometown text check (char_length(hometown) <= 100),
  allergies text[] not null default '{}',
  -- Animal-lover profile (null for pet owners).
  loved_species text[],
  open_to_pet_species text[],
  -- Shaped like Preferences / Dealbreakers / NotificationSettings in the domain.
  preferences jsonb not null default '{}'::jsonb,
  dealbreakers jsonb not null default '{}'::jsonb,
  notifications jsonb not null default
    '{"matches": true, "messages": true, "likes": true, "playDates": true}'::jsonb,
  paused boolean not null default false,
  onboarding_complete boolean not null default false,
  onboarding_steps text[] not null default '{}',
  -- Test accounts created by scripts/seed; one cleanup script deletes exactly these.
  is_seed boolean not null default false,
  created_at timestamptz not null default now(),
  last_active_at timestamptz not null default now()
);
create index profiles_discoverable_idx on public.profiles (last_active_at desc)
  where onboarding_complete and not paused;
create index profiles_seed_idx on public.profiles (id) where is_seed;

-- Exact coordinates are private to their owner. Everyone else only sees `profiles.city`;
-- distances will be computed server-side so nobody can triangulate another person.
create table public.profile_locations (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  lat double precision not null check (lat between -90 and 90),
  lng double precision not null check (lng between -180 and 180),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- pets, photos, prompt answers
-- ---------------------------------------------------------------------------
create table public.pets (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 50),
  species text not null check (species in ('dog', 'cat', 'rabbit', 'bird', 'other')),
  breed text check (char_length(breed) <= 100),
  age_years numeric(4, 1) not null check (age_years >= 0 and age_years <= 40),
  size text check (size in ('small', 'medium', 'large', 'giant')),
  energy text not null check (energy in ('low', 'medium', 'high')),
  good_with_dogs text not null default 'unsure' check (good_with_dogs in ('yes', 'no', 'unsure')),
  good_with_cats text not null default 'unsure' check (good_with_cats in ('yes', 'no', 'unsure')),
  good_with_kids text not null default 'unsure' check (good_with_kids in ('yes', 'no', 'unsure')),
  personality_tags text[] not null default '{}',
  position int not null default 0,
  created_at timestamptz not null default now()
);
create index pets_owner_idx on public.pets (owner_id, position);

-- One table for person photos (pet_id is null) and pet photos.
create table public.photos (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  pet_id uuid references public.pets (id) on delete cascade,
  -- Full public URL. Seed data points at external images; real uploads use Storage.
  url text not null,
  -- Set for Storage uploads, so the file can be removed with the row.
  storage_path text,
  caption text check (char_length(caption) <= 80),
  position int not null default 0,
  created_at timestamptz not null default now()
);
create index photos_owner_idx on public.photos (owner_id, position) where pet_id is null;
create index photos_pet_idx on public.photos (pet_id, position) where pet_id is not null;

create table public.prompt_answers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  -- Id from src/config/prompts.ts (prompts live in the app, not the database).
  prompt_id text not null,
  answer text not null check (char_length(answer) between 1 and 500),
  position int not null default 0,
  created_at timestamptz not null default now()
);
create index prompt_answers_user_idx on public.prompt_answers (user_id, position);

-- ---------------------------------------------------------------------------
-- discovery: likes, passes, matches
-- ---------------------------------------------------------------------------
create table public.likes (
  id uuid primary key default gen_random_uuid(),
  from_user_id uuid not null references public.profiles (id) on delete cascade,
  to_user_id uuid not null references public.profiles (id) on delete cascade,
  -- Polymorphic: a photo, prompt answer or pet id (no foreign key on purpose).
  target_type text not null check (target_type in ('photo', 'prompt', 'pet')),
  target_id uuid not null,
  comment text check (char_length(comment) <= 200),
  is_treat boolean not null default false,
  -- Set when the recipient removes the like from Likes You.
  removed_at timestamptz,
  created_at timestamptz not null default now(),
  check (from_user_id <> to_user_id)
);
-- One live like per pair, but a removed like can be sent again (same as the mock).
create unique index likes_one_live_per_pair_idx on public.likes (from_user_id, to_user_id)
  where removed_at is null;
create index likes_incoming_idx on public.likes (to_user_id, created_at desc)
  where removed_at is null;
create index likes_sent_idx on public.likes (from_user_id, created_at desc);

create table public.passes (
  viewer_id uuid not null references public.profiles (id) on delete cascade,
  target_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (viewer_id, target_id),
  check (viewer_id <> target_id)
);
create index passes_target_idx on public.passes (target_id);

-- user_a < user_b always, so a pair has exactly one possible row.
create table public.matches (
  id uuid primary key default gen_random_uuid(),
  user_a uuid not null references public.profiles (id) on delete cascade,
  user_b uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  check (user_a < user_b),
  unique (user_a, user_b)
);
create index matches_user_b_idx on public.matches (user_b);

-- ---------------------------------------------------------------------------
-- chat and Play Dates
-- ---------------------------------------------------------------------------
create table public.date_plans (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches (id) on delete cascade,
  proposer_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null check (kind in ('dog_park', 'pet_friendly_cafe', 'hiking_trail', 'beach', 'custom')),
  custom_label text check (char_length(custom_label) <= 60),
  location text check (char_length(location) <= 200),
  starts_at timestamptz not null,
  status text not null default 'proposed'
    check (status in ('proposed', 'accepted', 'declined', 'change_suggested')),
  note text check (char_length(note) <= 200),
  responded_by_id uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);
create index date_plans_match_idx on public.date_plans (match_id);
create index date_plans_proposer_idx on public.date_plans (proposer_id);
create index date_plans_responder_idx on public.date_plans (responded_by_id)
  where responded_by_id is not null;

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches (id) on delete cascade,
  sender_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null default 'text' check (kind in ('text', 'date_plan')),
  body text check (char_length(body) between 1 and 1000),
  -- Deleting a Play Date removes its card from the chat.
  date_plan_id uuid references public.date_plans (id) on delete cascade,
  created_at timestamptz not null default now(),
  read_at timestamptz,
  check (
    (kind = 'text' and body is not null and date_plan_id is null)
    or (kind = 'date_plan' and date_plan_id is not null and body is null)
  )
);
create index messages_match_idx on public.messages (match_id, created_at);
create index messages_sender_idx on public.messages (sender_id);
create index messages_plan_idx on public.messages (date_plan_id) where date_plan_id is not null;
-- "Unread in this chat" lookups.
create index messages_unread_idx on public.messages (match_id) where read_at is null;

-- ---------------------------------------------------------------------------
-- safety
-- ---------------------------------------------------------------------------
create table public.blocks (
  blocker_id uuid not null references public.profiles (id) on delete cascade,
  blocked_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);
create index blocks_blocked_idx on public.blocks (blocked_id);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles (id) on delete cascade,
  reported_id uuid not null references public.profiles (id) on delete cascade,
  reason text not null check (reason in (
    'fake_profile', 'inappropriate_photos', 'harassment', 'spam', 'underage', 'animal_welfare', 'other'
  )),
  details text check (char_length(details) <= 1000),
  created_at timestamptz not null default now(),
  check (reporter_id <> reported_id)
);
create index reports_reporter_idx on public.reports (reporter_id);
create index reports_reported_idx on public.reports (reported_id);

-- RLS on everywhere. Policies come next; until then every table denies all API access.
alter table public.profiles enable row level security;
alter table public.profile_locations enable row level security;
alter table public.pets enable row level security;
alter table public.photos enable row level security;
alter table public.prompt_answers enable row level security;
alter table public.likes enable row level security;
alter table public.passes enable row level security;
alter table public.matches enable row level security;
alter table public.date_plans enable row level security;
alter table public.messages enable row level security;
alter table public.blocks enable row level security;
alter table public.reports enable row level security;

-- ---------------------------------------------------------------------------
-- sign-up: every new auth user gets a bare profile.
-- is_seed is read from app_metadata, which only the service role can set
-- (user_metadata is user-editable and must never be trusted).
-- ---------------------------------------------------------------------------
create function private.handle_new_user() returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, is_seed)
  values (new.id, coalesce((new.raw_app_meta_data ->> 'is_seed')::boolean, false));
  return new;
end;
$$;
revoke execute on function private.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();
