/**
 * Onboarding flow rules: step order per user type, validation, and profile completeness.
 * Pure: the UI layer only renders what this decides.
 */
import { config } from '@/config';
import { ageFromBirthdate } from './geo';
import type { AccountKind, ISODate, Profile } from './types';

export type OnboardingStepId =
  | 'name'
  | 'birthday'
  | 'gender'
  | 'interested-in'
  | 'location'
  | 'goal'
  | 'photos'
  | 'has-pet'
  | 'pet-basics'
  | 'pet-details'
  | 'pet-vibe'
  | 'pet-photos'
  | 'more-pets'
  | 'lover-species'
  | 'lover-allergies'
  | 'lover-open'
  | 'prompts'
  | 'done';

const COMMON_START: OnboardingStepId[] = [
  'name',
  'birthday',
  'gender',
  'interested-in',
  'location',
  'goal',
  'photos',
  'has-pet',
];
const OWNER_STEPS: OnboardingStepId[] = [
  'pet-basics',
  'pet-details',
  'pet-vibe',
  'pet-photos',
  'more-pets',
];
const LOVER_STEPS: OnboardingStepId[] = ['lover-species', 'lover-allergies', 'lover-open'];
const COMMON_END: OnboardingStepId[] = ['prompts', 'done'];

/** Steps that can be skipped ("finish later"). Everything else is required. */
export const SKIPPABLE_STEPS: ReadonlySet<OnboardingStepId> = new Set([
  'location',
  'goal',
  'lover-allergies',
  'prompts',
]);

export function buildSteps(kind: AccountKind): OnboardingStepId[] {
  return [...COMMON_START, ...(kind === 'pet_owner' ? OWNER_STEPS : LOVER_STEPS), ...COMMON_END];
}

export function nextStep(current: OnboardingStepId, kind: AccountKind): OnboardingStepId {
  const steps = buildSteps(kind);
  const i = steps.indexOf(current);
  return steps[Math.min(steps.length - 1, i + 1)]!;
}

export function previousStep(
  current: OnboardingStepId,
  kind: AccountKind,
): OnboardingStepId | null {
  const steps = buildSteps(kind);
  const i = steps.indexOf(current);
  return i > 0 ? steps[i - 1]! : null;
}

/** 0–1 progress through the flow for the progress bar. */
export function stepProgress(current: OnboardingStepId, kind: AccountKind): number {
  const steps = buildSteps(kind);
  return Math.max(0, steps.indexOf(current)) / (steps.length - 1);
}

/** Where to resume: the first step the user hasn't completed or skipped. */
export function firstIncompleteStep(
  doneSteps: readonly string[],
  kind: AccountKind,
): OnboardingStepId {
  const steps = buildSteps(kind);
  return steps.find((s) => !doneSteps.includes(s)) ?? 'done';
}

export type BirthdateResult =
  | { ok: true; birthdate: ISODate; age: number }
  | { ok: false; reason: 'incomplete' | 'invalid' | 'too_young' | 'too_old' };

/** Validates month/day/year text fields. Enforces 18+. */
export function validateBirthdate(
  month: string,
  day: string,
  year: string,
  now: Date = new Date(),
): BirthdateResult {
  if (!month.trim() || !day.trim() || year.trim().length < 4) {
    return { ok: false, reason: 'incomplete' };
  }
  const m = Number(month);
  const d = Number(day);
  const y = Number(year);
  if (![m, d, y].every(Number.isInteger) || y < 1900) return { ok: false, reason: 'invalid' };
  const date = new Date(Date.UTC(y, m - 1, d));
  // Rejects things like Feb 31, which Date would silently roll over.
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) {
    return { ok: false, reason: 'invalid' };
  }
  if (date.getTime() > now.getTime()) return { ok: false, reason: 'invalid' };
  const iso = date.toISOString().slice(0, 10);
  const age = ageFromBirthdate(iso, now);
  if (age < config.minAge) return { ok: false, reason: 'too_young' };
  if (age > config.maxAge) return { ok: false, reason: 'too_old' };
  return { ok: true, birthdate: iso, age };
}

export const BIRTHDATE_MESSAGES: Record<
  Exclude<BirthdateResult, { ok: true }>['reason'],
  string | null
> = {
  incomplete: null,
  invalid: "That doesn't look like a real date.",
  too_young: `You need to be ${config.minAge} or older to join.`,
  too_old: "That doesn't look right. Double-check the year?",
};

export interface CompletenessItem {
  key: string;
  label: string;
  done: boolean;
}

/** What's still worth adding to a profile. Drives the Profile tab checklist and ranking. */
export function profileCompleteness(profile: Profile): {
  score: number;
  items: CompletenessItem[];
} {
  const { user, pets } = profile;
  const petPhotoCount = pets.reduce((n, p) => n + p.photos.length, 0);
  const items: CompletenessItem[] = [
    {
      key: 'photos',
      label: 'Add at least 3 photos of you',
      done: user.photos.length >= config.minPhotos,
    },
    {
      key: 'prompts',
      label: `Answer ${config.minPromptAnswers} prompts`,
      done: user.promptAnswers.length >= config.minPromptAnswers,
    },
    { key: 'goal', label: 'Share what you’re looking for', done: !!user.relationshipGoal },
    {
      key: 'basics',
      label: 'Add your job or hometown',
      done: !!(user.basics.job || user.basics.hometown || user.basics.school),
    },
    user.kind === 'pet_owner'
      ? {
          key: 'pets',
          label: 'Add 3+ photos of your pet',
          done: pets.length > 0 && petPhotoCount >= config.minPetPhotosForOwner,
        }
      : {
          key: 'lover',
          label: 'Pick the animals you love',
          done: (user.animalLover?.lovedSpecies.length ?? 0) > 0,
        },
  ];
  const done = items.filter((i) => i.done).length;
  return { score: done / items.length, items };
}
