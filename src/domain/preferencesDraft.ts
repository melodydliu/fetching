/**
 * Pure rules for the Preferences screen (who shows up in Discover), which edits a draft and
 * saves on request. No UI or service imports.
 */
import { config } from '@/config';
import { ageFromBirthdate } from './geo';
import { defaultDealbreakers, defaultPreferences } from './defaults';
import type { Dealbreakers, Preferences, Species, User } from './types';

export interface PreferencesDraft {
  preferences: Preferences;
  dealbreakers: Dealbreakers;
  allergies: Species[];
}

export const DISTANCE_OPTIONS = [5, 10, 25, 50, 100, 200] as const;

/** Preferences that can be turned into a dealbreaker (age and distance are always enforced). */
export type DealbreakerKey = Exclude<keyof Dealbreakers, 'age' | 'distance' | 'petNotGoodWith'>;

export function draftFromUser(user: User): PreferencesDraft {
  return {
    preferences: user.preferences,
    dealbreakers: user.dealbreakers,
    allergies: user.allergies,
  };
}

/** Moves one end of the age range by `delta`, keeping min <= max inside the allowed ages. */
export function stepAge(
  range: Preferences['ageRange'],
  end: 'min' | 'max',
  delta: number,
): Preferences['ageRange'] {
  if (end === 'min') {
    return { ...range, min: Math.min(Math.max(range.min + delta, config.minAge), range.max) };
  }
  return { ...range, max: Math.max(Math.min(range.max + delta, config.maxAge), range.min) };
}

/** Whether a preference currently has something selected, i.e. a dealbreaker would mean something. */
export function hasSelection(
  prefs: Preferences,
  key: DealbreakerKey,
  allergies: Species[],
): boolean {
  switch (key) {
    case 'relationshipGoals':
    case 'petSpecies':
    case 'petSizes':
    case 'petEnergy':
      return prefs[key].length > 0;
    case 'show':
      return prefs.show !== 'both';
    case 'allergies':
      return allergies.length > 0;
  }
}

/** Turns off dealbreakers whose preference was cleared, so nothing is enforced invisibly. */
export function normalizeDraft(draft: PreferencesDraft): PreferencesDraft {
  const dealbreakers = { ...draft.dealbreakers };
  const keys: DealbreakerKey[] = [
    'relationshipGoals',
    'show',
    'petSpecies',
    'petSizes',
    'petEnergy',
    'allergies',
  ];
  for (const key of keys) {
    if (!hasSelection(draft.preferences, key, draft.allergies)) dealbreakers[key] = false;
  }
  return { ...draft, dealbreakers };
}

export function isDirty(user: User, draft: PreferencesDraft): boolean {
  return (
    JSON.stringify(normalizeDraft(draft)) !== JSON.stringify(normalizeDraft(draftFromUser(user)))
  );
}

/** Back to the defaults a new user gets (their age and who they're interested in), keeping nothing else. */
export function resetDraft(user: User, now: Date = new Date()): PreferencesDraft {
  return {
    preferences: defaultPreferences(ageFromBirthdate(user.birthdate, now), user.interestedIn),
    // "My pet isn't good with..." and allergies are facts about me, not filters, so they stay.
    dealbreakers: { ...defaultDealbreakers(), petNotGoodWith: user.dealbreakers.petNotGoodWith },
    allergies: user.allergies,
  };
}

/** The patch to save. */
export function toUserPatch(
  draft: PreferencesDraft,
): Pick<User, 'preferences' | 'dealbreakers' | 'allergies'> {
  return normalizeDraft(draft);
}
