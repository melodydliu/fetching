import type { Profile } from '../types';

export type PreferenceRule =
  'genders' | 'relationshipGoals' | 'show' | 'petSpecies' | 'petSizes' | 'petEnergy';

export interface PreferenceCheck {
  rule: PreferenceRule;
  /** The owner actually set this preference. */
  set: boolean;
  /** We have the data to judge it. Unknown values are neutral. */
  known: boolean;
  satisfied: boolean;
}

/** Evaluates `owner`'s preferences against `other`. Age and distance are always hard, so not here. */
export function preferenceChecks(owner: Profile, other: Profile): PreferenceCheck[] {
  const prefs = owner.user.preferences;
  const dogsWithSize = other.pets.filter((p) => p.species === 'dog' && p.size);

  return [
    {
      rule: 'genders',
      set: prefs.genders.length > 0,
      known: true,
      satisfied: prefs.genders.includes(other.user.gender),
    },
    {
      rule: 'relationshipGoals',
      set: prefs.relationshipGoals.length > 0,
      known: other.user.relationshipGoals.length > 0,
      satisfied: other.user.relationshipGoals.some((g) => prefs.relationshipGoals.includes(g)),
    },
    {
      rule: 'show',
      set: prefs.show !== 'both',
      known: true,
      satisfied:
        prefs.show === 'pet_owners'
          ? other.user.kind === 'pet_owner'
          : other.user.kind === 'animal_lover',
    },
    {
      rule: 'petSpecies',
      set: prefs.petSpecies.length > 0,
      known: true,
      satisfied: other.pets.some((p) => prefs.petSpecies.includes(p.species)),
    },
    {
      // Only dogs have sizes, so someone without a sized dog is neutral, not a mismatch.
      rule: 'petSizes',
      set: prefs.petSizes.length > 0,
      known: dogsWithSize.length > 0,
      satisfied: dogsWithSize.some((p) => p.size !== undefined && prefs.petSizes.includes(p.size)),
    },
    {
      rule: 'petEnergy',
      set: prefs.petEnergy.length > 0,
      known: other.pets.length > 0,
      satisfied: other.pets.some((p) => prefs.petEnergy.includes(p.energy)),
    },
  ];
}

/**
 * Which of `owner`'s dealbreakers `other` breaks. Empty means none.
 * A dealbreaker only fires on a known mismatch: skipping a question never gets someone hidden.
 */
export function dealbreakerViolations(owner: Profile, other: Profile): string[] {
  const { dealbreakers, allergies } = owner.user;
  const broken: string[] = preferenceChecks(owner, other)
    .filter((c) => dealbreakers[c.rule] && c.set && c.known && !c.satisfied)
    .map((c) => c.rule);

  const theirSpecies = new Set(other.pets.map((p) => p.species));
  if (dealbreakers.petNotGoodWith.some((s) => theirSpecies.has(s))) broken.push('petNotGoodWith');
  if (dealbreakers.allergies && allergies.some((s) => theirSpecies.has(s)))
    broken.push('allergies');
  return broken;
}

/**
 * How well `other` fits the preferences `owner` did NOT mark as dealbreakers, 0–100.
 * Null when there is nothing to judge.
 */
export function softPreferenceScore(owner: Profile, other: Profile): number | null {
  const judged = preferenceChecks(owner, other).filter((c) => c.set && c.known);
  if (judged.length === 0) return null;
  return (100 * judged.filter((c) => c.satisfied).length) / judged.length;
}
