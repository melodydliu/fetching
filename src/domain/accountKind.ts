/**
 * A profile is a pet owner exactly when it has a pet; there's no separate account type to pick.
 * Pure rules for keeping `user.kind` in step with the pets. No UI or service imports.
 */
import { promptById } from '@/config/prompts';
import type { AccountKind, Pet, User } from './types';

export const kindForPets = (pets: readonly Pet[]): AccountKind =>
  pets.length > 0 ? 'pet_owner' : 'animal_lover';

/**
 * The change to save after the pet list changed, or null when `kind` is already right.
 * Becoming an animal lover drops pet-only prompts (never leaving zero) and adds lover defaults;
 * adding a first pet just makes them a pet owner.
 */
export function kindPatchForPets(user: User, pets: readonly Pet[]): Partial<User> | null {
  const target = kindForPets(pets);
  if (user.kind === target) return null;
  if (target === 'pet_owner') return { kind: target };
  const kept = user.promptAnswers.filter((a) => promptById(a.promptId)?.category !== 'pet');
  return {
    kind: target,
    animalLover: user.animalLover ?? { lovedSpecies: [], openToPetSpecies: [] },
    promptAnswers: kept.length > 0 ? kept : user.promptAnswers,
  };
}
