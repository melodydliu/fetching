import { buildFeed, type LikedYou } from '@/domain/matching';
import type { ID } from '@/domain/types';
import type { Candidate, DiscoveryService } from '../types';
import { MockDb, simulate } from './db';

/**
 * Candidates come from the pure matching module: hard filters, then ranking.
 * A real backend can run the same `buildFeed` server-side.
 */
export function createMockDiscovery(db: MockDb): DiscoveryService {
  return {
    getCandidates: (viewerId, options) =>
      simulate(() => {
        const viewer = db.profileOf(viewerId);

        // Everyone the viewer has already dealt with, or must never see.
        const excluded = new Set<ID>(db.passes.get(viewerId) ?? []);
        db.likes.filter((l) => l.fromUserId === viewerId).forEach((l) => excluded.add(l.toUserId));
        db.matches
          .filter((m) => m.userIds.includes(viewerId))
          .forEach((m) => m.userIds.forEach((id) => excluded.add(id)));
        db.blocks.forEach((b) => {
          if (b.blockerId === viewerId) excluded.add(b.blockedId);
          if (b.blockedId === viewerId) excluded.add(b.blockerId);
        });

        // People who already liked the viewer surface sooner (Treats most of all).
        const incomingLikes = new Map<ID, LikedYou>();
        db.likes
          .filter((l) => l.toUserId === viewerId && !db.removedLikeIds.has(l.id))
          .forEach((l) => {
            const prior = incomingLikes.get(l.fromUserId);
            incomingLikes.set(l.fromUserId, { isTreat: l.isTreat || (prior?.isTreat ?? false) });
          });

        const pool = [...db.users.keys()]
          .filter((id) => id !== viewerId)
          .map((id) => db.profileOf(id));
        const feed = buildFeed(viewer, pool, {
          now: new Date(),
          excludedIds: excluded,
          incomingLikes,
        });

        const candidates: Candidate[] = feed.map((r) => ({
          user: r.profile.user,
          pets: r.profile.pets,
          distanceMiles: r.distanceMiles,
          compatibility: r.compatibility,
          likedYou: r.likedYou,
        }));
        return candidates.slice(0, options?.limit ?? candidates.length);
      }),
    pass: (viewerId, targetUserId) =>
      simulate(() => {
        const set = db.passes.get(viewerId) ?? new Set<string>();
        set.add(targetUserId);
        db.passes.set(viewerId, set);
      }),
  };
}
