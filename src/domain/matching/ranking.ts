import { profileCompleteness } from '../onboarding';
import type { Profile } from '../types';
import { MATCHING_CONFIG, type MatchingConfig } from './config';
import { softPreferenceScore } from './preferences';
import type { Compatibility, LikedYou } from './types';

export interface RankParts {
  pet: number;
  goals: number;
  distance: number;
  completeness: number;
  recency: number;
  preferences: number;
}

export interface RankInput {
  now: Date;
  distanceMiles: number;
  likedYou: LikedYou | null;
}

/** Any shared relationship goal scores 100, none 20. Unknown on either side is neutral. */
export function goalsScore(
  viewer: Profile,
  candidate: Profile,
  cfg: MatchingConfig = MATCHING_CONFIG,
): number {
  const theirs = candidate.user.relationshipGoals;
  const mine = viewer.user.relationshipGoals;
  if (theirs.length === 0) return cfg.rank.neutral;
  if (theirs.some((g) => viewer.user.preferences.relationshipGoals.includes(g))) return 100;
  if (mine.length === 0) return cfg.rank.neutral;
  return theirs.some((g) => mine.includes(g)) ? 100 : 20;
}

/** Closer is better: 100 at zero miles, 0 at the viewer's maximum distance. */
export function distanceScore(distanceMiles: number, maxMiles: number): number {
  if (maxMiles <= 0) return 0;
  return Math.max(0, Math.min(100, 100 * (1 - distanceMiles / maxMiles)));
}

/** Recently active scores higher. Unparseable dates are neutral. */
export function recencyScore(
  lastActiveAt: string,
  now: Date,
  cfg: MatchingConfig = MATCHING_CONFIG,
): number {
  const t = new Date(lastActiveAt).getTime();
  if (Number.isNaN(t)) return cfg.rank.neutral;
  const hours = Math.max(0, (now.getTime() - t) / 3_600_000);
  const { fullHours, zeroHours } = cfg.rank.recency;
  if (hours <= fullHours) return 100;
  if (hours >= zeroHours) return 0;
  return (100 * (zeroHours - hours)) / (zeroHours - fullHours);
}

/**
 * Weighted blend of pet compatibility, shared goals, distance, completeness, recency and soft
 * preferences, plus a boost when the candidate already liked the viewer (bigger for a Treat).
 */
export function rankCandidate(
  viewer: Profile,
  candidate: Profile,
  input: RankInput,
  compatibility: Compatibility,
  cfg: MatchingConfig = MATCHING_CONFIG,
): { rank: number; parts: RankParts } {
  const parts: RankParts = {
    pet: compatibility.score,
    goals: goalsScore(viewer, candidate, cfg),
    distance: distanceScore(input.distanceMiles, viewer.user.preferences.maxDistanceMiles),
    completeness: 100 * profileCompleteness(candidate).score,
    recency: recencyScore(candidate.user.lastActiveAt, input.now, cfg),
    preferences: softPreferenceScore(viewer, candidate) ?? cfg.rank.neutral,
  };
  const w = cfg.rank.weights;
  let rank =
    w.pet * parts.pet +
    w.goals * parts.goals +
    w.distance * parts.distance +
    w.completeness * parts.completeness +
    w.recency * parts.recency +
    w.preferences * parts.preferences;
  if (input.likedYou)
    rank += input.likedYou.isTreat ? cfg.rank.boosts.treat : cfg.rank.boosts.likedYou;
  return { rank, parts };
}
