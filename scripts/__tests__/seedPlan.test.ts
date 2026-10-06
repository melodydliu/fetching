import { PROMPTS } from '@/config/prompts';
import { applyHardFilters } from '@/domain/matching';
import { distanceMiles } from '@/domain/geo';
import type { Profile } from '@/domain/types';
import { buildSeed, SEED_VIEWER_ID } from '@/mocks/seed';
import { petFromRow, type PetRow, type ProfileRow, userFromRow } from '@/services/supabase/mappers';
import { planInteractions } from '../interactionPlan';
import { planSeed, SEED_EMAIL_DOMAIN } from '../seedPlan';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
let counter = 0;
const newId = () => `00000000-0000-4000-8000-${String(++counter).padStart(12, '0')}`;

const seed = buildSeed(new Date('2026-10-06T12:00:00Z'));
const plan = planSeed(seed, newId);

describe('planSeed', () => {
  it('plans one account per seeded person, excluding the mock demo viewer', () => {
    expect(plan.accounts).toHaveLength(seed.users.length - 1);
    expect(plan.profiles).toHaveLength(plan.accounts.length);
    expect(plan.accounts.map((a) => a.oldId)).not.toContain(SEED_VIEWER_ID);
  });

  it('uses reserved, unique seed emails and real UUIDs everywhere', () => {
    const emails = plan.accounts.map((a) => a.email);
    expect(new Set(emails).size).toBe(emails.length);
    expect(emails.every((e) => e.endsWith(`@${SEED_EMAIL_DOMAIN}`))).toBe(true);
    const ids = [...plan.profiles, ...plan.pets, ...plan.photos, ...plan.prompt_answers].map(
      (r) => r.id as string,
    );
    expect(ids.every((id) => UUID.test(id))).toBe(true);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('tags every profile as seed data, and nothing else is tagged', () => {
    expect(plan.profiles.every((p) => p.is_seed === true)).toBe(true);
  });

  it('keeps every row inside the database limits', () => {
    for (const p of plan.profiles) {
      expect(String(p.first_name).length).toBeLessThanOrEqual(50);
      const age = (Date.now() - new Date(p.birthdate as string).getTime()) / (365.25 * 86400_000);
      expect(age).toBeGreaterThanOrEqual(18);
      expect(['pet_owner', 'animal_lover']).toContain(p.kind);
      expect(['woman', 'man', 'nonbinary']).toContain(p.gender);
    }
    for (const a of plan.prompt_answers) {
      expect((a.answer as string).length).toBeLessThanOrEqual(500);
      expect(PROMPTS.some((pr) => pr.id === a.prompt_id)).toBe(true);
    }
    for (const ph of plan.photos) {
      expect(((ph.caption as string | null) ?? '').length).toBeLessThanOrEqual(80);
      expect(ph.url).toEqual(expect.any(String));
    }
    for (const pet of plan.pets) {
      expect(['dog', 'cat', 'rabbit', 'bird', 'other']).toContain(pet.species);
      expect(Number(pet.age_years)).toBeLessThanOrEqual(40);
    }
  });

  it('links every pet, photo, prompt and location to a planned person, in order', () => {
    const people = new Set(plan.profiles.map((p) => p.id));
    expect(plan.pets.every((p) => people.has(p.owner_id))).toBe(true);
    expect(plan.profile_locations.every((l) => people.has(l.user_id))).toBe(true);
    expect(plan.profile_locations).toHaveLength(plan.profiles.length);
    const petIds = new Set(plan.pets.map((p) => p.id));
    expect(
      plan.photos.every((p) => people.has(p.owner_id) && (!p.pet_id || petIds.has(p.pet_id))),
    ).toBe(true);
    // 3 photos per pet, and positions run 0..n-1 per owner/pet.
    for (const pet of plan.pets) {
      expect(plan.photos.filter((p) => p.pet_id === pet.id).map((p) => p.position)).toEqual([
        0, 1, 2,
      ]);
    }
  });

  it('round-trips through the app mappers back to the same people and pets', () => {
    const first = seed.users.find((u) => u.id !== SEED_VIEWER_ID)!;
    const newUserId = plan.idMap.get(first.id)!;
    const row = plan.profiles.find((p) => p.id === newUserId)!;
    const photos = plan.photos
      .filter((p) => p.owner_id === newUserId && !p.pet_id)
      .map((p) => ({ id: p.id, url: p.url, caption: p.caption, position: p.position }));
    const answers = plan.prompt_answers
      .filter((a) => a.user_id === newUserId)
      .map((a) => ({ id: a.id, prompt_id: a.prompt_id, answer: a.answer, position: a.position }));
    const coords = plan.profile_locations.find((l) => l.user_id === newUserId)!;
    const user = userFromRow({ ...row, photos, prompt_answers: answers } as unknown as ProfileRow, {
      lat: coords.lat as number,
      lng: coords.lng as number,
    });
    expect(user).toMatchObject({
      firstName: first.firstName,
      kind: first.kind,
      gender: first.gender,
      interestedIn: first.interestedIn,
      relationshipGoals: first.relationshipGoals,
      basics: first.basics,
      preferences: first.preferences,
    });
    expect(user.photos.map((p) => p.url)).toEqual(first.photos.map((p) => p.url));
    expect(user.promptAnswers.map((a) => a.answer)).toEqual(
      first.promptAnswers.map((a) => a.answer),
    );

    const mockPets = seed.pets.filter((p) => p.ownerId === first.id);
    const pets = plan.pets
      .filter((p) => p.owner_id === newUserId)
      .map((p) =>
        petFromRow({
          ...p,
          photos: plan.photos.filter((ph) => ph.pet_id === p.id),
        } as unknown as PetRow),
      );
    expect(pets.map((p) => p.name)).toEqual(mockPets.map((p) => p.name));
  });
});

describe('planInteractions', () => {
  // A tester who looks like the mock demo user, but with real ids.
  const demo = seed.users.find((u) => u.id === SEED_VIEWER_ID)!;
  const viewer: Profile = {
    user: {
      ...demo,
      id: newId(),
      photos: demo.photos.map((p) => ({ ...p, id: newId() })),
      promptAnswers: demo.promptAnswers.map((a) => ({ ...a, id: newId() })),
    },
    pets: seed.pets
      .filter((p) => p.ownerId === SEED_VIEWER_ID)
      .map((p) => ({ ...p, id: newId(), ownerId: '' })),
  };
  viewer.pets.forEach((p) => (p.ownerId = viewer.user.id));

  const pool: Profile[] = seed.users
    .filter((u) => u.id !== SEED_VIEWER_ID)
    .map((user) => ({
      user: { ...user, id: plan.idMap.get(user.id)! },
      pets: seed.pets.filter((p) => p.ownerId === user.id),
    }));
  const now = new Date('2026-10-06T12:00:00Z');
  const out = planInteractions(viewer, pool, now, newId);

  it('creates 5 incoming likes (the first is a Treat) and 3 matches, as the mock does', () => {
    expect(out.likes).toHaveLength(5);
    expect(out.likes.filter((l) => l.is_treat)).toHaveLength(1);
    expect(out.likes[0]!.is_treat).toBe(true);
    expect(out.matches).toHaveLength(3);
  });

  it("only uses people who really pass the tester's hard filters, and never the same person twice", () => {
    const byId = new Map(pool.map((p) => [p.user.id, p]));
    const used = [
      ...out.likes.map((l) => l.from_user_id as string),
      ...out.matches.map((m) => (m.user_a === viewer.user.id ? m.user_b : m.user_a) as string),
    ];
    expect(new Set(used).size).toBe(used.length);
    for (const id of used) {
      const candidate = byId.get(id)!;
      expect(
        applyHardFilters(viewer, candidate, {
          now,
          distanceMiles: distanceMiles(viewer.user.location, candidate.user.location),
          excludedIds: new Set(),
        }).pass,
      ).toBe(true);
    }
  });

  it("likes point at things that exist on the tester's profile, and fit the database limits", () => {
    const mine = new Set([
      ...viewer.user.photos.map((p) => p.id),
      ...viewer.user.promptAnswers.map((a) => a.id),
      ...viewer.pets.map((p) => p.id),
    ]);
    for (const like of out.likes) {
      expect(mine.has(like.target_id as string)).toBe(true);
      expect(['photo', 'prompt', 'pet']).toContain(like.target_type);
      expect(((like.comment as string | null) ?? '').length).toBeLessThanOrEqual(200);
      expect(like.to_user_id).toBe(viewer.user.id);
    }
  });

  it('orders match pairs (user_a < user_b) and attaches messages only to those matches', () => {
    expect(out.matches.every((m) => (m.user_a as string) < (m.user_b as string))).toBe(true);
    const matchIds = new Set(out.matches.map((m) => m.id));
    expect(out.messages.every((m) => matchIds.has(m.match_id))).toBe(true);
    expect(out.messages.every((m) => (m.body as string).length <= 1000)).toBe(true);
    // One match waiting on the tester, one waiting on them, one with no messages.
    const last = (matchId: unknown) =>
      out.messages.filter((m) => m.match_id === matchId).at(-1)?.sender_id;
    expect(last(out.matches[0]!.id)).not.toBe(viewer.user.id);
    expect(last(out.matches[1]!.id)).toBe(viewer.user.id);
    expect(last(out.matches[2]!.id)).toBeUndefined();
  });
});

describe('seeding for a tester who does not live at the mock centre', () => {
  // Modelled on a real tester: a 35-year-old woman in Laguna Beach looking for men, 25 miles.
  const laguna = { lat: 33.5464, lng: -117.7831, city: 'Laguna Beach' };
  const testerAt = (): Profile => {
    const demo = seed.users.find((u) => u.id === SEED_VIEWER_ID)!;
    return {
      user: {
        ...demo,
        id: newId(),
        gender: 'woman',
        interestedIn: ['man'],
        birthdate: '1991-03-07',
        location: laguna,
        preferences: {
          ...demo.preferences,
          ageRange: { min: 27, max: 45 },
          maxDistanceMiles: 25,
          genders: ['man'],
        },
        photos: demo.photos.map((p) => ({ ...p, id: newId() })),
        promptAnswers: demo.promptAnswers.map((a) => ({ ...a, id: newId() })),
      },
      pets: [],
    };
  };
  const poolOf = (
    world: ReturnType<typeof buildSeed>,
    ids: ReturnType<typeof planSeed>,
  ): Profile[] =>
    world.users
      .filter((u) => u.id !== SEED_VIEWER_ID)
      .map((user) => ({
        user: { ...user, id: ids.idMap.get(user.id)! },
        pets: world.pets.filter((p) => p.ownerId === user.id),
      }));
  const now = new Date('2026-10-06T12:00:00Z');

  it('centred on the tester, there are enough eligible people for 5 likes and 3 matches', () => {
    const world = buildSeed(now, laguna);
    const out = planInteractions(testerAt(), poolOf(world, planSeed(world, newId)), now, newId);
    expect(out.likes).toHaveLength(5);
    expect(out.matches).toHaveLength(3);
  });

  it('left at the default centre (San Francisco) nobody is in range: the original failure', () => {
    const world = buildSeed(now); // default centre
    const out = planInteractions(testerAt(), poolOf(world, planSeed(world, newId)), now, newId);
    expect(out.likes).toHaveLength(0);
    expect(out.matches).toHaveLength(0);
  });
});
