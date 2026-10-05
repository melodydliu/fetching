import { ageFromBirthdate } from '../geo';
import type { Gender, ID, Profile } from '../types';
import { dealbreakerViolations } from './preferences';

export type FilterFailure =
  | {
      reason: 'self' | 'excluded' | 'paused' | 'incomplete' | 'orientation' | 'age' | 'distance';
    }
  | { reason: 'dealbreaker'; by: 'viewer' | 'candidate'; rules: string[] };

export type FilterResult = { pass: true } | { pass: false; failure: FilterFailure };

export interface FilterContext {
  now: Date;
  distanceMiles: number;
  excludedIds: ReadonlySet<ID>;
}

const fits = (interestedIn: Gender[], gender: Gender) => interestedIn.includes(gender);

/** Each side must be interested in the other's gender. */
export const mutualOrientationFit = (a: Profile, b: Profile): boolean =>
  fits(a.user.interestedIn, b.user.gender) && fits(b.user.interestedIn, a.user.gender);

const inRange = (age: number, range: { min: number; max: number }) =>
  age >= range.min && age <= range.max;

const fail = (failure: FilterFailure): FilterResult => ({ pass: false, failure });

/**
 * The non-negotiable rules for showing `candidate` to `viewer`.
 * Age and distance work both ways; dealbreakers from EITHER person apply.
 */
export function applyHardFilters(
  viewer: Profile,
  candidate: Profile,
  ctx: FilterContext,
): FilterResult {
  if (viewer.user.id === candidate.user.id) return fail({ reason: 'self' });
  if (ctx.excludedIds.has(candidate.user.id)) return fail({ reason: 'excluded' });
  if (candidate.user.paused) return fail({ reason: 'paused' });
  if (!candidate.user.onboardingComplete) return fail({ reason: 'incomplete' });
  if (!mutualOrientationFit(viewer, candidate)) return fail({ reason: 'orientation' });

  const viewerAge = ageFromBirthdate(viewer.user.birthdate, ctx.now);
  const candidateAge = ageFromBirthdate(candidate.user.birthdate, ctx.now);
  if (
    !inRange(candidateAge, viewer.user.preferences.ageRange) ||
    !inRange(viewerAge, candidate.user.preferences.ageRange)
  ) {
    return fail({ reason: 'age' });
  }

  if (
    ctx.distanceMiles > viewer.user.preferences.maxDistanceMiles ||
    ctx.distanceMiles > candidate.user.preferences.maxDistanceMiles
  ) {
    return fail({ reason: 'distance' });
  }

  const viewerBroken = dealbreakerViolations(viewer, candidate);
  if (viewerBroken.length)
    return fail({ reason: 'dealbreaker', by: 'viewer', rules: viewerBroken });
  const candidateBroken = dealbreakerViolations(candidate, viewer);
  if (candidateBroken.length) {
    return fail({ reason: 'dealbreaker', by: 'candidate', rules: candidateBroken });
  }
  return { pass: true };
}
