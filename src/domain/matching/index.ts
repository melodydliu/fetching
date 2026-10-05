export { MATCHING_CONFIG, type MatchingConfig } from './config';
export { buildFeed } from './feed';
export { applyHardFilters, mutualOrientationFit, type FilterResult } from './filters';
export { compatibilityLabel, petCompatibility } from './petCompatibility';
export { dealbreakerViolations, preferenceChecks, softPreferenceScore } from './preferences';
export { distanceScore, goalsScore, rankCandidate, recencyScore } from './ranking';
export type {
  Compatibility,
  CompatibilityLabel,
  CompatibilityReason,
  FeedContext,
  LikedYou,
  RankedCandidate,
} from './types';
