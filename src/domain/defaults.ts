import type { Dealbreakers, Gender, NotificationSettings, Preferences } from './types';

export const defaultDealbreakers = (): Dealbreakers => ({
  age: false,
  distance: false,
  relationshipGoals: false,
  show: false,
  petSpecies: false,
  petSizes: false,
  petEnergy: false,
  petNotGoodWith: [],
  allergies: false,
});

/** Sensible starting preferences for a new user, derived from their age and who they're into. */
export const defaultPreferences = (age: number, genders: Gender[]): Preferences => ({
  ageRange: { min: Math.max(18, age - 8), max: Math.min(99, age + 10) },
  maxDistanceMiles: 25,
  genders,
  relationshipGoals: [],
  show: 'both',
  petSpecies: [],
  petSizes: [],
  petEnergy: [],
});

export const defaultNotifications = (): NotificationSettings => ({
  matches: true,
  messages: true,
  likes: true,
  playDates: true,
});
