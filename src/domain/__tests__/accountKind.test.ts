import { buildSeed, SEED_VIEWER_ID } from '@/mocks/seed';
import { kindForPets, kindPatchForPets } from '../accountKind';

const seed = buildSeed(new Date());
const user = seed.users.find((u) => u.id === SEED_VIEWER_ID)!;
const pets = seed.pets.filter((p) => p.ownerId === SEED_VIEWER_ID);

describe('kindForPets', () => {
  it('a profile with a pet is a pet owner, without one an animal lover', () => {
    expect(kindForPets(pets)).toBe('pet_owner');
    expect(kindForPets([])).toBe('animal_lover');
  });
});

describe('kindPatchForPets', () => {
  it('is null when the kind already matches the pets', () => {
    expect(kindPatchForPets({ ...user, kind: 'pet_owner' }, pets)).toBeNull();
    expect(kindPatchForPets({ ...user, kind: 'animal_lover' }, [])).toBeNull();
  });

  it('an animal lover who adds a pet becomes a pet owner', () => {
    expect(kindPatchForPets({ ...user, kind: 'animal_lover' }, pets)).toEqual({
      kind: 'pet_owner',
    });
  });

  it('removing the last pet makes an animal lover: lover defaults, pet prompts dropped', () => {
    const owner = {
      ...user,
      kind: 'pet_owner' as const,
      animalLover: undefined,
      promptAnswers: [
        { id: 'a', promptId: 'pet-judge', answer: 'x' },
        { id: 'b', promptId: 'not-a-pet-prompt', answer: 'y' },
      ],
    };
    const patch = kindPatchForPets(owner, [])!;
    expect(patch.kind).toBe('animal_lover');
    expect(patch.animalLover).toEqual({ lovedSpecies: [], openToPetSpecies: [] });
    expect(patch.promptAnswers?.map((a) => a.id)).toEqual(['b']);
  });

  it('never leaves zero prompts, and keeps existing lover preferences', () => {
    const owner = {
      ...user,
      kind: 'pet_owner' as const,
      animalLover: { lovedSpecies: ['cat' as const], openToPetSpecies: [] },
      promptAnswers: [{ id: 'a', promptId: 'pet-judge', answer: 'x' }],
    };
    const patch = kindPatchForPets(owner, [])!;
    expect(patch.promptAnswers).toHaveLength(1);
    expect(patch.animalLover?.lovedSpecies).toEqual(['cat']);
  });
});
