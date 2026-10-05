import type { MatchRepository, MatchSummary } from '../types';
import { MockDb, simulate } from './db';

export function createMockMatches(db: MockDb): MatchRepository {
  return {
    list: (userId) =>
      simulate(() =>
        db.matches
          .filter((m) => m.userIds.includes(userId) && !db.isBlocked(m.userIds[0], m.userIds[1]))
          .map((match): MatchSummary => {
            const messages = db.messages.filter((m) => m.matchId === match.id);
            const lastMessage = messages[messages.length - 1];
            return {
              match,
              otherUserId: match.userIds.find((id) => id !== userId)!,
              lastMessage,
              yourTurn: !!lastMessage && lastMessage.senderId !== userId,
              isNew: !lastMessage,
            };
          })
          .sort((a, b) =>
            (b.lastMessage?.createdAt ?? b.match.createdAt).localeCompare(
              a.lastMessage?.createdAt ?? a.match.createdAt,
            ),
          ),
      ),
    get: (matchId) => simulate(() => db.matches.find((m) => m.id === matchId) ?? null),
    unmatch: (matchId) =>
      simulate(() => {
        db.matches = db.matches.filter((m) => m.id !== matchId);
        db.messages = db.messages.filter((m) => m.matchId !== matchId);
      }),
  };
}
