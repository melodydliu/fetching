/**
 * Pure helpers for the Edit profile screen, which edits a draft and saves it on request.
 * No UI or service imports.
 */
import type { User } from './types';

export type ProfileDraft = Pick<
  User,
  | 'firstName'
  | 'birthdate'
  | 'gender'
  | 'interestedIn'
  | 'photos'
  | 'promptAnswers'
  | 'basics'
  | 'relationshipGoals'
  | 'location'
  | 'animalLover'
>;

const DRAFT_KEYS: (keyof ProfileDraft)[] = [
  'firstName',
  'birthdate',
  'gender',
  'interestedIn',
  'photos',
  'promptAnswers',
  'basics',
  'relationshipGoals',
  'location',
  'animalLover',
];

export function draftFromUser(user: User): ProfileDraft {
  return {
    firstName: user.firstName,
    birthdate: user.birthdate,
    gender: user.gender,
    interestedIn: user.interestedIn,
    photos: user.photos,
    promptAnswers: user.promptAnswers,
    basics: user.basics,
    relationshipGoals: user.relationshipGoals,
    location: user.location,
    animalLover: user.animalLover,
  };
}

/** Trims text and drops empty values, so "  " and undefined count as the same thing. */
export function normalizeDraft(draft: ProfileDraft): ProfileDraft {
  const clean = (s?: string) => s?.trim() || undefined;
  return {
    ...draft,
    firstName: draft.firstName.trim(),
    basics: { job: clean(draft.basics.job), hometown: clean(draft.basics.hometown) },
  };
}

/** Only the fields that differ from the saved user, ready for `users.update`. */
export function changedFields(user: User, draft: ProfileDraft): Partial<ProfileDraft> {
  const saved = draftFromUser(user);
  const next = normalizeDraft(draft);
  const changes: Partial<ProfileDraft> = {};
  for (const key of DRAFT_KEYS) {
    // Basics may carry a legacy field, so compare the normalized shapes.
    const before = key === 'basics' ? normalizeDraft(saved).basics : saved[key];
    if (JSON.stringify(before) !== JSON.stringify(next[key])) {
      (changes as Record<string, unknown>)[key] = next[key];
    }
  }
  return changes;
}

/** What blocks saving, or null. The birthday is validated by its own field. */
export function draftProblem(draft: ProfileDraft, birthdateOk: boolean): string | null {
  if (!draft.firstName.trim()) return 'Add your first name.';
  if (!birthdateOk) return 'Check your birthday.';
  if (draft.interestedIn.length === 0) return 'Pick who you’re interested in.';
  return null;
}

/**
 * The full patch to save for `changes`: changing who you're interested in also resets the
 * "genders" discovery preference, so the two never disagree.
 */
export function profileUpdateFor(user: User, changes: Partial<ProfileDraft>): Partial<User> {
  if (!changes.interestedIn) return changes;
  return { ...changes, preferences: { ...user.preferences, genders: changes.interestedIn } };
}
