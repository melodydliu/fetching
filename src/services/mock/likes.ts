import { config } from '@/config';
import type { Like, Match } from '@/domain/types';
import { AlreadyLikedError, type LikeRepository, QuotaExceededError } from '../types';
import { isSameLocalDay, MockDb, simulate, startOfTomorrow } from './db';

export function createMockLikes(db: MockDb): LikeRepository {
  const quotaFor = (userId: string) => {
    const sentToday = db.likes.filter(
      (l) => l.fromUserId === userId && isSameLocalDay(l.createdAt),
    );
    const o = db.quotaOverride;
    return {
      likesRemaining:
        o.likes ?? Math.max(0, config.dailyLikeLimit - sentToday.filter((l) => !l.isTreat).length),
      likesLimit: config.dailyLikeLimit,
      treatAvailable:
        o.treatAvailable ?? sentToday.filter((l) => l.isTreat).length < config.dailyTreatLimit,
      resetsAt: startOfTomorrow().toISOString(),
    };
  };

  return {
    getQuota: (userId) => simulate(() => quotaFor(userId)),
    send: (input) =>
      simulate(() => {
        if (input.fromUserId === input.toUserId) throw new Error("You can't like yourself");
        const alreadyLiked = db.likes.some(
          (l) =>
            l.fromUserId === input.fromUserId &&
            l.toUserId === input.toUserId &&
            !db.removedLikeIds.has(l.id),
        );
        if (alreadyLiked) throw new AlreadyLikedError();
        const quota = quotaFor(input.fromUserId);
        if (input.isTreat ? !quota.treatAvailable : quota.likesRemaining === 0) {
          throw new QuotaExceededError(input.isTreat ? 'treat' : 'like');
        }
        const like: Like = {
          id: db.nextId('like'),
          fromUserId: input.fromUserId,
          toUserId: input.toUserId,
          target: input.target,
          comment: input.comment?.trim() || undefined,
          isTreat: input.isTreat ?? false,
          createdAt: new Date().toISOString(),
        };
        db.likes.push(like);
        // A Dev Menu override stands in for the real count, so spend it down here.
        const o = db.quotaOverride;
        if (input.isTreat) {
          if (o.treatAvailable !== undefined) o.treatAvailable = false;
        } else if (o.likes !== undefined) {
          o.likes = Math.max(0, o.likes - 1);
        }

        const reciprocal = db.likes.find(
          (l) =>
            l.fromUserId === input.toUserId &&
            l.toUserId === input.fromUserId &&
            !db.removedLikeIds.has(l.id),
        );
        let match: Match | null = null;
        if (reciprocal && !db.findMatch(input.fromUserId, input.toUserId)) {
          match = {
            id: db.nextId('match'),
            userIds: [input.fromUserId, input.toUserId],
            createdAt: new Date().toISOString(),
          };
          db.matches.push(match);
        }
        return { like, match };
      }),
    listIncoming: (userId) =>
      simulate(() =>
        db.likes
          .filter(
            (l) =>
              l.toUserId === userId &&
              !db.removedLikeIds.has(l.id) &&
              !db.findMatch(userId, l.fromUserId) &&
              !db.isBlocked(userId, l.fromUserId) &&
              db.users.has(l.fromUserId),
          )
          .sort(
            (a, b) =>
              Number(b.isTreat) - Number(a.isTreat) || b.createdAt.localeCompare(a.createdAt),
          ),
      ),
    remove: (likeId) =>
      simulate(() => {
        db.removedLikeIds.add(likeId);
      }),
  };
}
