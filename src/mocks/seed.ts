import { config } from '@/config';
import { PROMPTS } from '@/config/prompts';
import { PERSONALITY_TAGS } from '@/config/reference';
import { defaultDealbreakers } from '@/domain/defaults';
import type {
  DogSize,
  EnergyLevel,
  Gender,
  Pet,
  Photo,
  Preferences,
  RelationshipGoal,
  Species,
  Tri,
  User,
} from '@/domain/types';
import { CAT_PHOTOS, DOG_PHOTOS } from './imagePools';
import { PROMPT_ANSWERS } from './promptAnswers';

/** Deterministic PRNG so every reset produces the same world. */
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const WOMEN = [
  'Maya',
  'Priya',
  'Chloe',
  'Imani',
  'Sofia',
  'Hannah',
  'Lucia',
  'Naomi',
  'Grace',
  'Aiko',
  'Tessa',
  'Marisol',
  'Ruth',
  'Zara',
  'Elise',
  'Dana',
  'Keiko',
  'Bianca',
];
const MEN = [
  'Jordan',
  'Mateo',
  'Ethan',
  'Kofi',
  'Daniel',
  'Arjun',
  'Noah',
  'Felix',
  'Luis',
  'Owen',
  'Sam',
  'Theo',
  'Marcus',
  'Ravi',
  'Caleb',
  'Jin',
  'Andre',
  'Wes',
];
const NONBINARY = ['Rowan', 'Sage', 'Quinn', 'Avery', 'Reese', 'Emery'];
const JOBS = [
  'Nurse',
  'Software engineer',
  'Teacher',
  'Barista',
  'Graphic designer',
  'Vet tech',
  'Architect',
  'Chef',
  'Paralegal',
  'Photographer',
  'Physical therapist',
  'Data analyst',
  'Carpenter',
  'Journalist',
  'Product manager',
  'Librarian',
  'Marketing lead',
  'Electrician',
];
const HOMETOWNS = [
  'Oakland',
  'Portland',
  'Austin',
  'Chicago',
  'Honolulu',
  'Denver',
  'Brooklyn',
  'San Jose',
  'Seattle',
  'Phoenix',
  'Boston',
];
const PET_NAMES = {
  dog: [
    'Biscuit',
    'Mochi',
    'Waffles',
    'Juniper',
    'Otis',
    'Pepper',
    'Cooper',
    'Luna',
    'Banjo',
    'Maple',
    'Ziggy',
    'Rosie',
    'Moose',
    'Daisy',
    'Tucker',
    'Nova',
    'Bear',
    'Ginger',
    'Pickles',
    'Willow',
  ],
  cat: ['Miso', 'Pumpkin', 'Olive', 'Mochi', 'Salem', 'Poppy', 'Tofu', 'Clementine', 'Gus', 'Fig'],
  rabbit: ['Clover', 'Thumper', 'Cocoa', 'Biscotti'],
  bird: ['Kiwi', 'Pico', 'Sunny', 'Mango'],
  other: ['Gizmo', 'Nugget'],
} as const;
/** Only breeds we actually have sharp, high-resolution photos for. */
const DOG_BREED_NAMES = Object.keys(DOG_PHOTOS).filter((b) => (DOG_PHOTOS[b]?.length ?? 0) > 0);

/**
 * Adult, clearly framed faces from pravatar.cc (served at 800px so they stay sharp full-bleed).
 * Hand-picked from the 70 available; the set also contains children, costumes and elders.
 */
const FACES = {
  woman: [
    5, 16, 19, 20, 21, 23, 25, 26, 27, 28, 29, 30, 31, 32, 34, 35, 36, 38, 40, 41, 43, 44, 45, 47,
    49,
  ],
  man: [7, 8, 11, 12, 13, 14, 18, 33, 51, 52, 53, 54, 57, 59, 60, 68, 15, 55, 56, 61, 3],
  nonbinary: [48, 62, 9, 24, 39, 10],
} as const;
const faceUrl = (n: number) => `https://i.pravatar.cc/800?img=${n}`;
const CAT_BREED_LIST = [
  'Domestic shorthair',
  'Domestic longhair',
  'Bengal',
  'Maine Coon',
  'Ragdoll',
  'Siamese',
  'Persian',
];
const DOG_SIZE_BY_BREED: Record<string, DogSize> = {
  'Labrador Retriever': 'large',
  'Golden Retriever': 'large',
  Beagle: 'medium',
  Corgi: 'small',
  Poodle: 'medium',
  'Siberian Husky': 'large',
  Pug: 'small',
  'French Bulldog': 'small',
  'Australian Shepherd': 'medium',
  Dachshund: 'small',
  'Border Collie': 'medium',
  'Shiba Inu': 'small',
  Chihuahua: 'small',
  Boxer: 'large',
};

/** Birthdates are anchored here so ages are stable and exact in tests. */
const NOW = new Date('2026-10-01T12:00:00Z');
const ME_ID = 'u-me';

export const SEED_VIEWER_ID = ME_ID;

/** Rough miles→degrees conversion; fine for fake data. */
function scatter(rand: () => number, maxMiles: number) {
  const radius = Math.sqrt(rand()) * maxMiles;
  const angle = rand() * Math.PI * 2;
  const dLat = (radius * Math.sin(angle)) / 69;
  const dLng =
    (radius * Math.cos(angle)) / (69 * Math.cos((config.mockCenter.lat * Math.PI) / 180));
  return { lat: config.mockCenter.lat + dLat, lng: config.mockCenter.lng + dLng };
}

export interface SeedData {
  users: User[];
  pets: Pet[];
}

/** `now` only moves activity timestamps, so the mock world feels recently active. */
export function buildSeed(now: Date = NOW): SeedData {
  const rand = mulberry32(20261001);
  const pick = <T>(arr: readonly T[]): T => arr[Math.floor(rand() * arr.length)]!;
  const chance = (p: number) => rand() < p;
  const photoIds = { n: 0 };
  const photo = (url: string, caption?: string): Photo => ({
    id: `ph-${++photoIds.n}`,
    url,
    caption,
  });

  const users: User[] = [];
  const pets: Pet[] = [];
  const usedPetNames = new Set<string>();
  const petName = (species: Species) => {
    const pool = PET_NAMES[species] as readonly string[];
    const free = pool.filter((n) => !usedPetNames.has(n));
    const name = free.length ? pick(free) : pick(pool);
    usedPetNames.add(name);
    return name;
  };

  /** One image repeated, so every photo on a profile clearly shows the same person or pet. */
  const repeat = (url: string, n: number): Photo[] => Array.from({ length: n }, () => photo(url));

  const dogCursor: Record<string, number> = {};
  let catCursor = 0;
  const dogPhotos = (breed: string, n: number) => {
    const pool = DOG_PHOTOS[breed]!;
    const i = dogCursor[breed] ?? 0;
    dogCursor[breed] = i + 1;
    return repeat(pool[i % pool.length]!, n);
  };
  const catPhotos = (n: number) => repeat(CAT_PHOTOS[catCursor++ % CAT_PHOTOS.length]!, n);

  // Shuffled once per gender so faces are varied but deterministic, and reused only when exhausted.
  const facePools = Object.fromEntries(
    (Object.keys(FACES) as (keyof typeof FACES)[]).map((g) => {
      const pool = [...FACES[g]];
      for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(rand() * (i + 1));
        [pool[i], pool[j]] = [pool[j]!, pool[i]!];
      }
      return [g, pool];
    }),
  ) as Record<keyof typeof FACES, number[]>;
  const faceCursor: Record<keyof typeof FACES, number> = { woman: 0, man: 0, nonbinary: 0 };
  const nextFace = (g: keyof typeof FACES) => {
    const pool = facePools[g];
    return pool[faceCursor[g]++ % pool.length]!;
  };

  function makePet(ownerId: string, species: Species, index: number): Pet {
    const energy = pick<EnergyLevel>(['low', 'medium', 'medium', 'high', 'high']);
    const tri = (yesBias: number): Tri =>
      chance(yesBias) ? 'yes' : chance(0.45) ? 'unsure' : 'no';
    const tags = Array.from(
      new Set([pick(PERSONALITY_TAGS), pick(PERSONALITY_TAGS), pick(PERSONALITY_TAGS)]),
    );
    const base = {
      id: `pet-${ownerId}-${index}`,
      ownerId,
      name: petName(species),
      species,
      energy,
      personalityTags: tags,
    };
    if (species === 'dog') {
      const breed = chance(0.08) ? 'Mixed breed' : pick(DOG_BREED_NAMES);
      const photoBreed = breed === 'Mixed breed' ? pick(DOG_BREED_NAMES) : breed;
      return {
        ...base,
        breed,
        ageYears: 1 + Math.floor(rand() * 11),
        size: DOG_SIZE_BY_BREED[photoBreed] ?? 'medium',
        goodWith: { dogs: tri(0.75), cats: tri(0.45), kids: tri(0.7) },
        photos: dogPhotos(photoBreed, 3),
      };
    }
    if (species === 'cat') {
      return {
        ...base,
        breed: pick(CAT_BREED_LIST),
        ageYears: 1 + Math.floor(rand() * 14),
        goodWith: { dogs: tri(0.35), cats: tri(0.55), kids: tri(0.6) },
        photos: catPhotos(3),
      };
    }
    const label =
      species === 'rabbit' ? 'Mini Lop' : species === 'bird' ? 'Budgerigar' : 'Guinea pig';
    return {
      ...base,
      breed: label,
      ageYears: 1 + Math.floor(rand() * 6),
      goodWith: { dogs: 'unsure', cats: 'unsure', kids: tri(0.7) },
      photos: [
        photo(`placeholder://${species}`),
        photo(`placeholder://${species}`),
        photo(`placeholder://${species}`),
      ],
    };
  }

  const ownerCount = 34; // of 45 users → ~75%
  const total = 45;
  const goals: RelationshipGoal[] = [
    'long_term',
    'long_term',
    'something_casual',
    'friends_first',
    'not_sure',
  ];
  const usedNames = new Set<string>();
  /** Most people pick one goal; about a quarter pick a second. */
  const pickGoals = (): RelationshipGoal[] => {
    const first = pick(goals);
    if (!chance(0.25)) return [first];
    const second = pick(goals);
    return second === first ? [first] : [first, second];
  };

  for (let i = 0; i < total; i++) {
    const isMe = i === 0;
    const gender: Gender = isMe
      ? 'woman'
      : pick<Gender>(['woman', 'woman', 'man', 'man', 'man', 'nonbinary']);
    const namePool = gender === 'woman' ? WOMEN : gender === 'man' ? MEN : NONBINARY;
    // Prefer a name matching the gender pool; fall back to any unused name if it runs dry.
    const available = namePool.filter((n) => !usedNames.has(n));
    const fallback = [...WOMEN, ...MEN, ...NONBINARY].filter((n) => !usedNames.has(n));
    const firstName = isMe ? 'Melody' : pick(available.length ? available : fallback);
    usedNames.add(firstName);

    const id = isMe ? ME_ID : `u-${i}`;
    const kind = i < ownerCount ? 'pet_owner' : 'animal_lover';
    const age = isMe ? 29 : 22 + Math.floor(rand() * 21);
    // Birthdays fall Jan–Sep so the birth year alone yields exactly `age` on NOW.
    const birthYear = NOW.getUTCFullYear() - age;
    const birthdate = `${birthYear}-${String(1 + Math.floor(rand() * 9)).padStart(2, '0')}-${String(1 + Math.floor(rand() * 28)).padStart(2, '0')}`;

    const interestedIn: Gender[] = isMe
      ? ['man', 'woman', 'nonbinary']
      : chance(0.12)
        ? [gender]
        : chance(0.2)
          ? ['man', 'woman', 'nonbinary']
          : gender === 'woman'
            ? ['man']
            : gender === 'man'
              ? ['woman']
              : ['man', 'woman', 'nonbinary'];

    // One face per person, repeated, so a profile never mixes different people.
    const selfPhotos = repeat(faceUrl(nextFace(gender)), 3 + Math.floor(rand() * 3));

    const ownerPets: Pet[] = [];
    if (kind === 'pet_owner') {
      const r = rand();
      const species: Species[] =
        i === 0
          ? ['dog']
          : r < 0.62
            ? ['dog']
            : r < 0.72
              ? ['dog', 'dog']
              : r < 0.84
                ? ['cat']
                : r < 0.9
                  ? ['dog', 'cat']
                  : r < 0.94
                    ? ['rabbit']
                    : r < 0.98
                      ? ['bird']
                      : ['cat', 'rabbit'];
      species.forEach((s, idx) => ownerPets.push(makePet(id, s, idx)));
    }

    const allPromptIds = PROMPTS.filter((p) =>
      kind === 'pet_owner' ? true : p.category === 'personal',
    );
    const chosen: string[] = [];
    if (kind === 'pet_owner') chosen.push(pick(PROMPTS.filter((p) => p.category === 'pet')).id);
    while (chosen.length < 3) {
      const p = pick(allPromptIds);
      if (!chosen.includes(p.id)) chosen.push(p.id);
    }

    const prefersOwners = chance(0.2);
    const preferences: Preferences = {
      // The demo user is easygoing so the demo feed is always healthy; everyone else varies.
      ageRange: isMe ? { min: 22, max: 45 } : { min: Math.max(18, age - 8), max: age + 10 },
      maxDistanceMiles: isMe ? 50 : pick([25, 30, 50, 50]),
      genders: interestedIn,
      relationshipGoals: [],
      show: prefersOwners ? 'pet_owners' : 'both',
      petSpecies: [],
      petSizes: [],
      petEnergy: [],
    };
    const dealbreakers = defaultDealbreakers();
    if (!isMe && chance(0.15)) dealbreakers.petNotGoodWith = [pick<'dog' | 'cat'>(['dog', 'cat'])];

    const lastActive = new Date(now.getTime() - Math.floor(rand() * 5 * 24) * 3600_000);
    const user: User = {
      id,
      kind,
      firstName,
      birthdate,
      gender,
      interestedIn,
      location: {
        ...scatter(rand, isMe ? 0 : config.seedRadiusMiles),
        city: config.mockCenter.city,
      },
      relationshipGoals: pickGoals(),
      basics: { job: pick(JOBS), hometown: pick(HOMETOWNS) },
      photos: selfPhotos,
      promptAnswers: chosen.map((promptId, k) => ({
        id: `pa-${id}-${k}`,
        promptId,
        answer: PROMPT_ANSWERS[promptId]![chance(0.5) ? 0 : 1],
      })),
      allergies:
        kind === 'animal_lover' && chance(0.3) ? [pick<Species>(['cat', 'rabbit', 'bird'])] : [],
      animalLover:
        kind === 'animal_lover'
          ? {
              lovedSpecies: Array.from(
                new Set<Species>(['dog', pick<Species>(['dog', 'cat', 'rabbit', 'bird'])]),
              ),
              openToPetSpecies: chance(0.7) ? ['dog', 'cat'] : ['dog'],
            }
          : undefined,
      preferences,
      dealbreakers,
      paused: false,
      onboardingComplete: true,
      onboardingSteps: [],
      createdAt: new Date(
        NOW.getTime() - (10 + Math.floor(rand() * 200)) * 86400_000,
      ).toISOString(),
      lastActiveAt: lastActive.toISOString(),
    };
    users.push(user);
    pets.push(...ownerPets);
  }

  return { users, pets };
}
