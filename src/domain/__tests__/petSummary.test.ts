import { summarizePets } from '../petSummary';
import type { Pet, Species } from '../types';

const pet = (species: Species): Pet => ({
  id: species + Math.random(),
  ownerId: 'u',
  name: 'x',
  species,
  ageYears: 1,
  energy: 'medium',
  goodWith: { dogs: 'unsure', cats: 'unsure', kids: 'unsure' },
  personalityTags: [],
  photos: [],
});

describe('summarizePets', () => {
  it('counts and pluralizes by species', () => {
    expect(summarizePets([pet('dog')])).toBe('1 dog');
    expect(summarizePets([pet('cat'), pet('cat')])).toBe('2 cats');
  });

  it('lists mixed species in first-seen order', () => {
    expect(summarizePets([pet('dog'), pet('cat'), pet('cat')])).toBe('1 dog, 2 cats');
    expect(summarizePets([pet('other'), pet('dog')])).toBe('1 other pet, 1 dog');
  });

  it('is empty with no pets', () => {
    expect(summarizePets([])).toBe('');
  });
});
