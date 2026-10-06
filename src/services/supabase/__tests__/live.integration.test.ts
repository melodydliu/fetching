/**
 * Runs against the REAL Supabase project, so it is skipped unless you ask for it:
 *
 *   set -a; source .env.local; set +a; RUN_LIVE_TESTS=1 npx jest src/services/supabase/__tests__/live
 *
 * It signs up throwaway users, exercises the repositories and a real photo upload, and deletes
 * every account (and its files) at the end. Needs "Confirm email" off for the project.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { config } from '@/config';
import { newId } from '@/utils/id';
import { createSupabaseServices } from '..';
import { installLiveFetch, LIVE, PHOTO_URI } from '@/test/liveSupport';
import type { Services } from '../../types';

jest.mock('@react-native-async-storage/async-storage', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

installLiveFetch();

const live = LIVE ? describe : describe.skip;

live('Supabase repositories (live)', () => {
  jest.setTimeout(60_000);
  const stamp = Date.now();
  const password = 'correct-horse-9';
  let s: Services;
  let me: string;
  let other: string;
  let other$: SupabaseClient;

  beforeAll(async () => {
    s = createSupabaseServices();
    other$ = createClient(config.supabaseUrl, config.supabaseKey, {
      auth: { persistSession: false },
    });
    me = (await s.auth.signUp({ email: `live-me-${stamp}@example.com`, password })).userId;
    const r = await other$.auth.signUp({ email: `live-other-${stamp}@example.com`, password });
    other = r.data.user!.id;
  });

  afterAll(async () => {
    await other$.rpc('delete_my_account'); // the second account signed in on its own client
    await s?.auth.deleteAccount(); // removes the first account and its uploaded files
  });

  it('starts as a bare, incomplete profile', async () => {
    const user = (await s.users.getById(me))!;
    expect(user.onboardingComplete).toBe(false);
    expect(user.preferences.maxDistanceMiles).toBe(25);
  });

  it('saves and reloads a full profile, including photos, prompts and own location', async () => {
    const photos = [0, 1, 2].map((i) => ({
      id: newId('ph'),
      url: `https://example.com/p${i}.jpg`,
      ...(i === 1 ? { caption: 'Beach day' } : {}),
    }));
    const promptAnswers = [{ id: newId('pa'), promptId: 'p1', answer: 'Fetch, obviously' }];
    const saved = await s.users.update(me, {
      firstName: 'Live',
      birthdate: '1995-05-05',
      gender: 'woman',
      interestedIn: ['man'],
      location: { city: 'Oakland', lat: 37.8, lng: -122.27 },
      relationshipGoals: ['long_term'],
      basics: { job: 'Vet' },
      photos,
      promptAnswers,
      onboardingSteps: ['name'],
    });
    expect(saved).toMatchObject({
      firstName: 'Live',
      birthdate: '1995-05-05',
      interestedIn: ['man'],
      basics: { job: 'Vet' },
      onboardingSteps: ['name'],
      location: { city: 'Oakland', lat: 37.8, lng: -122.27 },
    });
    expect(saved.photos).toEqual(photos);
    expect(saved.promptAnswers).toEqual(promptAnswers);

    // Reorder + drop one.
    const next = await s.users.update(me, { photos: [photos[2]!, photos[0]!] });
    expect(next.photos.map((p) => p.id)).toEqual([photos[2]!.id, photos[0]!.id]);
  });

  it('manages pets and their photos', async () => {
    const photo = (n: number) => ({ id: newId('ph'), url: `https://example.com/pet${n}.jpg` });
    const [a, b, c] = [photo(1), photo(2), photo(3)];
    const pet = await s.pets.create({
      ownerId: me,
      name: 'Biscuit',
      species: 'dog',
      ageYears: 3.5,
      size: 'medium',
      energy: 'high',
      goodWith: { dogs: 'yes', cats: 'unsure', kids: 'yes' },
      personalityTags: ['goofy'],
      photos: [a!, b!, c!],
    });
    expect(pet.ageYears).toBe(3.5);
    expect(pet.photos.map((p) => p.id)).toEqual([a!.id, b!.id, c!.id]);

    const updated = await s.pets.update(pet.id, { name: 'Biscuit II', photos: [c!, a!] });
    expect(updated.name).toBe('Biscuit II');
    expect(updated.photos.map((p) => p.id)).toEqual([c!.id, a!.id]);
    expect(await s.pets.listByOwner(me)).toHaveLength(1);
    // Person photos and pet photos stay separate.
    expect((await s.users.getById(me))!.photos.some((p) => p.id === a!.id)).toBe(false);

    await s.pets.remove(pet.id);
    expect(await s.pets.listByOwner(me)).toEqual([]);
  });

  it('uploads a photo to Storage and removes the file when the photo is dropped', async () => {
    const photo = await s.media.upload(PHOTO_URI);
    expect(photo.url).toContain(`/storage/v1/object/public/photos/${me}/${photo.id}.png`);
    expect((await fetch(photo.url)).status).toBe(200);

    await s.users.update(me, { photos: [photo] });
    await s.users.update(me, { photos: [] });
    expect((await fetch(`${photo.url}?gone=1`)).status).not.toBe(200);
  });

  it('blocks, lists, unblocks, and files a report', async () => {
    await s.users.block(me, other);
    await s.users.block(me, other); // idempotent
    expect(await s.users.listBlockedIds(me)).toEqual([other]);
    await s.users.unblock(me, other);
    expect(await s.users.listBlockedIds(me)).toEqual([]);

    const report = await s.users.report({ reporterId: me, reportedId: other, reason: 'spam' });
    expect(report.reason).toBe('spam');
  });
});
