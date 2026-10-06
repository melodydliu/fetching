-- Photo storage. One public bucket; files live at  <user id>/<random uuid>.<ext>
--
-- Public means anyone holding a photo's URL can view it without signing in. The paths contain
-- two random UUIDs so they can't be guessed, and this keeps image caching simple and fast.
-- If we later want photos visible only to matched/nearby people, switch the bucket to private
-- and serve signed URLs (a change to the media service only, not to screens).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'photos',
  'photos',
  true,
  8 * 1024 * 1024,
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic']
)
on conflict (id) do nothing;

-- Writes only inside your own folder. Replacing a file (upsert) needs insert + select + update,
-- so all four are granted; reading a public bucket by URL needs no policy at all.
create policy "photos: upload to own folder" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
create policy "photos: see own files" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
create policy "photos: replace own files" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
create policy "photos: delete own files" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
