/**
 * Turns the app's seeded "mock world" (src/mocks/seed.ts) into rows for the real database.
 * Pure: no network, no clock, no randomness of its own (ids come from `newId`), so it is
 * unit-tested and its output is also checked against the real table constraints.
 */
import type { SeedData } from '@/mocks/seed';
import { SEED_VIEWER_ID } from '@/mocks/seed';
import { profilePatchToRow } from '@/services/supabase/mappers';

import { seedEmail } from './seedConstants';

export { SEED_EMAIL_DOMAIN, seedEmail } from './seedConstants';

export type Row = Record<string, unknown>;

export interface SeedPlan {
  /** One auth account per seeded person, in order. `oldId` is the mock id (for mapping). */
  accounts: { email: string; oldId: string; newId: string }[];
  profiles: Row[];
  profile_locations: Row[];
  pets: Row[];
  photos: Row[];
  prompt_answers: Row[];
  /** Mock user id -> real id, for the interaction planner. */
  idMap: Map<string, string>;
}

/** The people to create: everyone in the mock world except its demo viewer. */
export const seedPeople = (seed: SeedData) => seed.users.filter((u) => u.id !== SEED_VIEWER_ID);

/**
 * `userIds` are the ids of the accounts already created (in the same order as the people
 * planned here); without them, fresh ids are made up (tests, SQL generation).
 */
export function planSeed(seed: SeedData, newId: () => string, userIds?: string[]): SeedPlan {
  // The mock's demo viewer is whoever signs in for real, not a seeded person.
  const people = seedPeople(seed);
  const idMap = new Map(people.map((u, i) => [u.id, userIds?.[i] ?? newId()]));

  const plan: SeedPlan = {
    accounts: [],
    profiles: [],
    profile_locations: [],
    pets: [],
    photos: [],
    prompt_answers: [],
    idMap,
  };

  people.forEach((user, index) => {
    const id = idMap.get(user.id)!;
    plan.accounts.push({ email: seedEmail(index + 1), oldId: user.id, newId: id });

    const { id: _mockId, ...fields } = user;
    plan.profiles.push({
      ...profilePatchToRow(fields),
      id,
      is_seed: true,
      created_at: user.createdAt,
      last_active_at: user.lastActiveAt,
    });
    plan.profile_locations.push({ user_id: id, lat: user.location.lat, lng: user.location.lng });

    user.photos.forEach((p, position) =>
      plan.photos.push({
        id: newId(),
        owner_id: id,
        pet_id: null,
        url: p.url,
        caption: p.caption ?? null,
        position,
      }),
    );
    user.promptAnswers.forEach((a, position) =>
      plan.prompt_answers.push({
        id: newId(),
        user_id: id,
        prompt_id: a.promptId,
        answer: a.answer,
        position,
      }),
    );

    seed.pets
      .filter((pet) => pet.ownerId === user.id)
      .forEach((pet, petPosition) => {
        const petId = newId();
        plan.pets.push({
          id: petId,
          owner_id: id,
          ...petRow(pet),
          position: petPosition,
        });
        pet.photos.forEach((p, position) =>
          plan.photos.push({
            id: newId(),
            owner_id: id,
            pet_id: petId,
            url: p.url,
            caption: p.caption ?? null,
            position,
          }),
        );
      });
  });

  return plan;
}

function petRow(pet: SeedData['pets'][number]): Row {
  return {
    name: pet.name,
    species: pet.species,
    breed: pet.breed ?? null,
    age_years: pet.ageYears ?? null,
    size: pet.size ?? null,
    energy: pet.energy,
    good_with_dogs: pet.goodWith.dogs,
    good_with_cats: pet.goodWith.cats,
    good_with_kids: pet.goodWith.kids,
    personality_tags: pet.personalityTags,
  };
}
