import { config } from '@/config';
import { PROMPTS } from '@/config/prompts';
import { ageFromBirthdate, distanceMiles } from '@/domain/geo';
import { buildSeed } from '../seed';

const { users, pets } = buildSeed();

describe('seed centre', () => {
  it('places everyone around the centre it is given (not the app default)', () => {
    const laguna = { lat: 33.5427, lng: -117.7854, city: 'Laguna Beach' };
    const world = buildSeed(new Date(), laguna);
    const others = world.users.filter((u) => u.id !== 'u-me');
    expect(others.every((u) => u.location.city === 'Laguna Beach')).toBe(true);
    expect(
      others.every((u) => distanceMiles(u.location, laguna) <= config.seedRadiusMiles + 1),
    ).toBe(true);
    // ...and the default world is still around the configured centre.
    expect(users.every((u) => u.location.city === config.mockCenter.city)).toBe(true);
  });
});

describe('seed data', () => {
  it('gives every person a real first name (even when the name pools run dry)', () => {
    expect(
      users.every((u) => typeof u.firstName === 'string' && u.firstName.trim().length > 0),
    ).toBe(true);
  });

  it('has 40–50 users', () => {
    expect(users.length).toBeGreaterThanOrEqual(40);
    expect(users.length).toBeLessThanOrEqual(50);
  });

  it('is deterministic', () => {
    expect(buildSeed()).toEqual(buildSeed());
  });

  it('has unique user ids, pet ids and photo ids', () => {
    const ids = <T extends { id: string }>(xs: T[]) => xs.map((x) => x.id);
    expect(new Set(ids(users)).size).toBe(users.length);
    expect(new Set(ids(pets)).size).toBe(pets.length);
    const photoIds = [...users.flatMap((u) => u.photos), ...pets.flatMap((p) => p.photos)].map(
      (p) => p.id,
    );
    expect(new Set(photoIds).size).toBe(photoIds.length);
  });

  it('is roughly 75% pet owners, the rest animal lovers', () => {
    const owners = users.filter((u) => u.kind === 'pet_owner').length;
    expect(owners / users.length).toBeGreaterThan(0.7);
    expect(owners / users.length).toBeLessThan(0.8);
  });

  it('is mostly dogs, with some other species and multi-pet homes', () => {
    const count = (s: string) => pets.filter((p) => p.species === s).length;
    expect(count('dog')).toBeGreaterThan(count('cat'));
    expect(count('cat')).toBeGreaterThan(0);
    expect(count('rabbit') + count('bird')).toBeGreaterThan(0);
    const perOwner = new Map<string, number>();
    pets.forEach((p) => perOwner.set(p.ownerId, (perOwner.get(p.ownerId) ?? 0) + 1));
    expect([...perOwner.values()].some((n) => n > 1)).toBe(true);
  });

  it('keeps every user an adult within the seed radius', () => {
    const center = config.mockCenter;
    users.forEach((u) => {
      expect(ageFromBirthdate(u.birthdate, new Date('2026-10-01'))).toBeGreaterThanOrEqual(
        config.minAge,
      );
      expect(distanceMiles(center, u.location)).toBeLessThanOrEqual(config.seedRadiusMiles + 0.5);
    });
  });

  it('gives each user 3–6 photos and 1–10 answered, valid prompts', () => {
    const promptIds = new Set(PROMPTS.map((p) => p.id));
    users.forEach((u) => {
      expect(u.photos.length).toBeGreaterThanOrEqual(config.minPhotos);
      expect(u.photos.length).toBeLessThanOrEqual(config.maxPhotos);
      expect(u.promptAnswers.length).toBeGreaterThanOrEqual(config.minPromptAnswers);
      expect(u.promptAnswers.length).toBeLessThanOrEqual(config.maxPromptAnswers);
      u.promptAnswers.forEach((a) => expect(promptIds.has(a.promptId)).toBe(true));
    });
  });

  it('gives pet owners 1+ pets with 3+ photos, and animal lovers a lover profile', () => {
    users.forEach((u) => {
      const owned = pets.filter((p) => p.ownerId === u.id);
      if (u.kind === 'pet_owner') {
        expect(owned.length).toBeGreaterThanOrEqual(1);
        expect(owned.flatMap((p) => p.photos).length).toBeGreaterThanOrEqual(
          config.minPetPhotosForOwner,
        );
        owned.forEach((p) => {
          expect(p.photos.length).toBeGreaterThanOrEqual(3);
          if (p.species === 'dog') expect(p.size).toBeDefined();
        });
      } else {
        expect(owned).toHaveLength(0);
        expect(u.animalLover?.lovedSpecies.length).toBeGreaterThan(0);
      }
    });
  });

  it('only gives pet prompts to pet owners', () => {
    const petPrompts = new Set(PROMPTS.filter((p) => p.category === 'pet').map((p) => p.id));
    users
      .filter((u) => u.kind === 'animal_lover')
      .forEach((u) =>
        u.promptAnswers.forEach((a) => expect(petPrompts.has(a.promptId)).toBe(false)),
      );
  });
});
