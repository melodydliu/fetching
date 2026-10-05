import type { Pet, Species } from './types';

const NAMES: Record<Species, [string, string]> = {
  dog: ['dog', 'dogs'],
  cat: ['cat', 'cats'],
  rabbit: ['rabbit', 'rabbits'],
  bird: ['bird', 'birds'],
  other: ['other pet', 'other pets'],
};

/** "1 dog", "2 cats", "1 dog, 2 cats". Species appear in the order first seen. */
export function summarizePets(pets: Pet[]): string {
  const counts = new Map<Species, number>();
  for (const pet of pets) counts.set(pet.species, (counts.get(pet.species) ?? 0) + 1);
  return [...counts].map(([species, n]) => `${n} ${NAMES[species][n === 1 ? 0 : 1]}`).join(', ');
}
