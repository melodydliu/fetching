-- A pet's age is optional in the app, so the column can be empty.
-- (The 0-40 range check stays; a check passes for null.)
alter table public.pets alter column age_years drop not null;
