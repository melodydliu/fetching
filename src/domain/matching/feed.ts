import { distanceMiles } from '../geo';
import type { Profile } from '../types';
import { MATCHING_CONFIG, type MatchingConfig } from './config';
import { applyHardFilters } from './filters';
import { petCompatibility } from './petCompatibility';
import { rankCandidate } from './ranking';
import type { FeedContext, RankedCandidate } from './types';

/**
 * The Discover feed: hard-filter the pool, score what's left, best first.
 * Ties break on user id so the order is stable between refreshes.
 */
export function buildFeed(
  viewer: Profile,
  pool: readonly Profile[],
  ctx: FeedContext,
  cfg: MatchingConfig = MATCHING_CONFIG,
): RankedCandidate[] {
  const ranked: RankedCandidate[] = [];
  for (const candidate of pool) {
    const miles = ctx.distances
      ? ctx.distances.get(candidate.user.id)
      : distanceMiles(viewer.user.location, candidate.user.location);
    if (miles === undefined) continue; // the server didn't put them in range
    const result = applyHardFilters(viewer, candidate, {
      now: ctx.now,
      distanceMiles: miles,
      excludedIds: ctx.excludedIds,
    });
    if (!result.pass) continue;

    const compatibility = petCompatibility(viewer, candidate, cfg);
    const likedYou = ctx.incomingLikes.get(candidate.user.id) ?? null;
    const { rank } = rankCandidate(
      viewer,
      candidate,
      { now: ctx.now, distanceMiles: miles, likedYou },
      compatibility,
      cfg,
    );
    ranked.push({ profile: candidate, distanceMiles: miles, compatibility, rank, likedYou });
  }
  return ranked.sort(
    (a, b) => b.rank - a.rank || a.profile.user.id.localeCompare(b.profile.user.id),
  );
}
