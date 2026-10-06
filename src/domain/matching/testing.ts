/** Builders for matching tests. Defaults describe a compatible, ordinary pair. */
import type { Pet, Profile, User } from '../types';

export const NOW = new Date('2026-10-05T12:00:00Z');

let counter = 0;
const nextId = (p: string) => `${p}-${++counter}`;

export function makeUser(overrides: Partial<User> = {}): User {
  const id = overrides.id ?? nextId('u');
  return {
    id,
    kind: 'pet_owner',
    firstName: 'Sam',
    birthdate: '1996-03-01', // 30 on NOW
    gender: 'man',
    interestedIn: ['woman'],
    location: { lat: 37.7749, lng: -122.4194, city: 'San Francisco' },
    relationshipGoals: ['long_term'],
    basics: { job: 'Nurse' },
    photos: [{ id: `${id}-ph1`, url: 'u1' }],
    promptAnswers: [],
    allergies: [],
    preferences: {
      ageRange: { min: 20, max: 45 },
      maxDistanceMiles: 25,
      genders: [],
      relationshipGoals: [],
      show: 'both',
      petSpecies: [],
      petSizes: [],
      petEnergy: [],
    },
    notifications: { matches: true, messages: true, likes: true, playDates: true },
    dealbreakers: {
      age: false,
      distance: false,
      relationshipGoals: false,
      show: false,
      petSpecies: false,
      petSizes: false,
      petEnergy: false,
      petNotGoodWith: [],
      allergies: false,
    },
    paused: false,
    onboardingComplete: true,
    onboardingSteps: [],
    createdAt: '2026-01-01T00:00:00Z',
    lastActiveAt: '2026-10-05T10:00:00Z',
    ...overrides,
  };
}

export function makePet(overrides: Partial<Pet> = {}): Pet {
  const id = overrides.id ?? nextId('pet');
  return {
    id,
    ownerId: 'owner',
    name: 'Biscuit',
    species: 'dog',
    ageYears: 3,
    size: 'medium',
    energy: 'medium',
    goodWith: { dogs: 'unsure', cats: 'unsure', kids: 'unsure' },
    personalityTags: [],
    photos: [],
    ...overrides,
  };
}

/** A profile whose pets are automatically owned by the user. */
export function makeProfile(userOverrides: Partial<User> = {}, pets: Partial<Pet>[] = []): Profile {
  const user = makeUser(userOverrides);
  return { user, pets: pets.map((p) => makePet({ ...p, ownerId: user.id })) };
}

/** The usual viewer: a woman who likes men. */
export const makeViewer = (u: Partial<User> = {}, pets: Partial<Pet>[] = [{}]) =>
  makeProfile({ firstName: 'Alex', gender: 'woman', interestedIn: ['man'], ...u }, pets);

/** The usual candidate: a man who likes women. */
export const makeCandidate = (u: Partial<User> = {}, pets: Partial<Pet>[] = [{}]) =>
  makeProfile({ firstName: 'Sam', gender: 'man', interestedIn: ['woman'], ...u }, pets);

export const lover = (
  u: Partial<User> = {},
  loved: User['animalLover'] = { lovedSpecies: ['dog'], openToPetSpecies: ['dog'] },
) => makeProfile({ kind: 'animal_lover', animalLover: loved, ...u }, []);

export const noExclusions: ReadonlySet<string> = new Set();
