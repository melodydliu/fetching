/**
 * Live test (REAL project, throwaway accounts, self-cleaning) of the whole matching flow:
 * Discover (server-measured distance), skip/undo, likes, quotas, Likes You, like back, remove,
 * mutual match, the Matches list, and unmatch. Run it with:
 *
 *   set -a; source .env.local; set +a; RUN_LIVE_TESTS=1 npx jest src/services/supabase/__tests__/live.flow
 */
import { defaultPreferences } from '@/domain/defaults';
import type { Gender } from '@/domain/types';
import { newId } from '@/utils/id';
import { AlreadyLikedError } from '../../types';
import { installLiveFetch, LIVE, type LiveUser, signUpLiveUser } from '@/test/liveSupport';

jest.mock('@react-native-async-storage/async-storage', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

installLiveFetch();

const live = LIVE ? describe : describe.skip;

const SF = { city: 'San Francisco', lat: 37.7749, lng: -122.4194 };
const OAKLAND = { city: 'Oakland', lat: 37.8044, lng: -122.2712 }; // ~8.4 miles from SF

async function finishProfile(
  u: LiveUser,
  name: string,
  gender: Gender,
  interestedIn: Gender[],
  location: typeof SF,
) {
  await u.services.users.update(u.id, {
    firstName: name,
    birthdate: '1995-05-05',
    gender,
    interestedIn,
    location,
    preferences: defaultPreferences(31, interestedIn),
    photos: [0, 1, 2].map((i) => ({ id: newId('ph'), url: `https://example.com/${name}${i}.jpg` })),
    onboardingComplete: true,
  });
}

live('matching flow (live)', () => {
  jest.setTimeout(120_000);
  let a: LiveUser; // woman in San Francisco
  let b: LiveUser; // man in Oakland, has a dog
  let c: LiveUser; // man in Oakland

  beforeAll(async () => {
    [a, b, c] = await Promise.all([signUpLiveUser('a'), signUpLiveUser('b'), signUpLiveUser('c')]);
    await finishProfile(a, 'Ada', 'woman', ['man'], SF);
    await finishProfile(b, 'Ben', 'man', ['woman'], OAKLAND);
    await finishProfile(c, 'Cal', 'man', ['woman'], OAKLAND);
    await b.services.pets.create({
      ownerId: b.id,
      name: 'Biscuit',
      species: 'dog',
      ageYears: 3,
      size: 'medium',
      energy: 'high',
      goodWith: { dogs: 'yes', cats: 'unsure', kids: 'yes' },
      personalityTags: [],
      photos: [0, 1, 2].map((i) => ({ id: newId('ph'), url: `https://example.com/dog${i}.jpg` })),
    });
  });

  afterAll(async () => {
    await Promise.allSettled([a, b, c].map((u) => u?.services.auth.deleteAccount()));
  });

  it("Discover shows people in range with server-measured distance, their pets, and no one's coordinates", async () => {
    const feed = await a.services.discovery.getCandidates(a.id);
    const ids = feed.map((f) => f.user.id);
    expect(ids).toEqual(expect.arrayContaining([b.id, c.id]));
    expect(ids).not.toContain(a.id);
    const ben = feed.find((f) => f.user.id === b.id)!;
    expect(ben.distanceMiles).toBe(9); // ~8.4 miles, rounded up
    expect(ben.pets.map((p) => p.name)).toEqual(['Biscuit']);
    expect(ben.user.location).toEqual({ city: 'Oakland', lat: 0, lng: 0 });
  });

  it('skipping hides someone and undo brings them back', async () => {
    await a.services.discovery.pass(a.id, c.id);
    expect((await a.services.discovery.getCandidates(a.id)).map((f) => f.user.id)).not.toContain(
      c.id,
    );
    await a.services.discovery.unpass(a.id, c.id);
    expect((await a.services.discovery.getCandidates(a.id)).map((f) => f.user.id)).toContain(c.id);
  });

  it('a like shows up in their Likes You, counts against my daily quota, and cannot repeat', async () => {
    const before = await a.services.likes.getQuota(a.id);
    const target = (await b.services.users.getById(b.id))!.photos[0]!;
    const { like, match } = await a.services.likes.send({
      fromUserId: a.id,
      toUserId: b.id,
      target: { type: 'photo', id: target.id },
      comment: 'Cute dog!',
    });
    expect(match).toBeNull();
    expect(like.comment).toBe('Cute dog!');
    expect((await a.services.likes.getQuota(a.id)).likesRemaining).toBe(before.likesRemaining - 1);

    const incoming = await b.services.likes.listIncoming(b.id);
    expect(incoming.map((l) => l.fromUserId)).toEqual([a.id]);
    await expect(
      a.services.likes.send({
        fromUserId: a.id,
        toUserId: b.id,
        target: { type: 'photo', id: target.id },
      }),
    ).rejects.toBeInstanceOf(AlreadyLikedError);

    // Liked people leave my Discover; the person who liked me knows it in theirs.
    expect((await a.services.discovery.getCandidates(a.id)).map((f) => f.user.id)).not.toContain(
      b.id,
    );
    const benFeed = await b.services.discovery.getCandidates(b.id);
    expect(benFeed.find((f) => f.user.id === a.id)?.likedYou).toEqual({ isTreat: false });
  });

  it('a mutual like makes a match, which then shows in both Matches lists as new', async () => {
    const adaPhoto = (await a.services.users.getById(a.id))!.photos[0]!;
    const { match } = await b.services.likes.send({
      fromUserId: b.id,
      toUserId: a.id,
      target: { type: 'photo', id: adaPhoto.id },
    });
    expect(match).not.toBeNull();
    expect(match!.userIds).toContain(a.id);

    const listA = await a.services.matches.list(a.id);
    expect(listA).toHaveLength(1);
    expect(listA[0]).toMatchObject({ otherUserId: b.id, isNew: true, yourTurn: false });
    expect((await b.services.matches.list(b.id))[0]).toMatchObject({ otherUserId: a.id });
    // Matched people leave Likes You.
    expect(await a.services.likes.listIncoming(a.id)).toEqual([]);
    expect(await a.services.matches.get(match!.id)).toMatchObject({ id: match!.id });
  });

  it('Likes You: remove hides a like (and they can like again), like back matches without spending a like', async () => {
    const adaPhoto = (await a.services.users.getById(a.id))!.photos[0]!;
    const first = await c.services.likes.send({
      fromUserId: c.id,
      toUserId: a.id,
      target: { type: 'photo', id: adaPhoto.id },
    });
    expect((await a.services.likes.listIncoming(a.id)).map((l) => l.id)).toEqual([first.like.id]);
    await a.services.likes.remove(first.like.id);
    expect(await a.services.likes.listIncoming(a.id)).toEqual([]);

    const second = await c.services.likes.send({
      fromUserId: c.id,
      toUserId: a.id,
      target: { type: 'photo', id: adaPhoto.id },
    });
    const quotaBefore = await a.services.likes.getQuota(a.id);
    const match = await a.services.likes.likeBack(second.like.id, a.id);
    expect(match.userIds).toContain(c.id);
    expect((await a.services.likes.getQuota(a.id)).likesRemaining).toBe(quotaBefore.likesRemaining);
    expect(await a.services.likes.listIncoming(a.id)).toEqual([]);
    expect(await a.services.matches.list(a.id)).toHaveLength(2);
  });

  it('unmatching removes the match for both people', async () => {
    const [first] = await a.services.matches.list(a.id);
    await a.services.matches.unmatch(first!.match.id);
    expect(await a.services.matches.list(a.id)).toHaveLength(1);
    expect((await b.services.matches.list(b.id)).some((m) => m.match.id === first!.match.id)).toBe(
      false,
    );
  });
});
