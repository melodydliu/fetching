import { promptById } from '@/config/prompts';
import type { DatePlan, Like, Match, Message } from '@/domain/types';
import type { DevTools } from '../types';
import { MockDb, simulate } from './db';

const REPLIES = [
  'Ha, that is so true!',
  'Okay but when can our dogs meet?',
  'I was just thinking the same thing.',
  'Tell me more about your weekend plans?',
  'That is the cutest thing I have heard all week.',
];

const COMMENTS = [
  'Obsessed with this.',
  'We would get along.',
  undefined,
  'Okay, you win.',
  undefined,
];

export function createMockDevTools(db: MockDb): DevTools {
  const activeId = () => {
    if (!db.sessionUserId) throw new Error('No active user');
    return db.sessionUserId;
  };
  const pickRandom = <T>(items: T[]): T | undefined =>
    items[Math.floor(Math.random() * items.length)];

  const strangers = (viewerId: string) =>
    [...db.users.values()].filter(
      (u) => u.id !== viewerId && !db.findMatch(viewerId, u.id) && !db.isBlocked(viewerId, u.id),
    );

  return {
    listUsers: () =>
      simulate(() =>
        [...db.users.values()].map(({ id, firstName, kind }) => ({ id, firstName, kind })),
      ),
    getActiveUserId: () => db.sessionUserId,
    switchUser: (userId) =>
      simulate(() => {
        db.requireUser(userId);
        db.sessionUserId = userId;
      }),
    reset: () =>
      simulate(() => {
        db.reset();
      }),
    setQuota: (quota) =>
      simulate(() => {
        db.quotaOverride = quota ? { ...quota } : {};
      }),
    simulateIncomingLike: () =>
      simulate(() => {
        const me = activeId();
        const alreadyLiked = new Set(
          db.likes.filter((l) => l.toUserId === me).map((l) => l.fromUserId),
        );
        const from = pickRandom(strangers(me).filter((u) => !alreadyLiked.has(u.id)));
        if (!from) return 'Everyone has already liked you.';
        const answer = from.promptAnswers[0];
        const like: Like = {
          id: db.nextId('like'),
          fromUserId: from.id,
          toUserId: me,
          target: answer
            ? { type: 'prompt', id: answer.id }
            : { type: 'photo', id: from.photos[0]!.id },
          comment: pickRandom(COMMENTS),
          isTreat: false,
          createdAt: new Date().toISOString(),
        };
        db.likes.push(like);
        const label = answer ? `"${promptById(answer.promptId)?.text ?? 'a prompt'}"` : 'a photo';
        return `${from.firstName} liked ${label}.`;
      }),
    simulateNewMatch: () =>
      simulate(() => {
        const me = activeId();
        const other = pickRandom(strangers(me));
        if (!other) return 'No one left to match with.';
        const match: Match = {
          id: db.nextId('match'),
          userIds: [me, other.id],
          createdAt: new Date().toISOString(),
        };
        db.matches.push(match);
        db.likes.forEach((l) => {
          if (l.fromUserId === other.id && l.toUserId === me) db.removedLikeIds.add(l.id);
        });
        return `You matched with ${other.firstName}!`;
      }),
    simulateIncomingMessage: () =>
      simulate(() => {
        const me = activeId();
        const match = pickRandom(db.matches.filter((m) => m.userIds.includes(me)));
        if (!match) return 'No matches yet. Simulate a new match first.';
        const senderId = match.userIds.find((id) => id !== me)!;
        const message: Message = {
          id: db.nextId('msg'),
          matchId: match.id,
          senderId,
          kind: 'text',
          text: pickRandom(REPLIES)!,
          createdAt: new Date().toISOString(),
        };
        db.addMessage(message);
        return `${db.requireUser(senderId).firstName} sent you a message.`;
      }),
    simulateIncomingDatePlan: () =>
      simulate(() => {
        const me = activeId();
        const match = pickRandom(db.matches.filter((m) => m.userIds.includes(me)));
        if (!match) return 'No matches yet. Simulate a new match first.';
        const senderId = match.userIds.find((id) => id !== me)!;
        const now = new Date();
        const startsAt = new Date(now.getTime() + 3 * 86_400_000);
        startsAt.setHours(11, 0, 0, 0);
        const plan: DatePlan = {
          id: db.nextId('plan'),
          matchId: match.id,
          proposerId: senderId,
          kind: 'dog_park',
          location: 'Sunny Meadow Off-Leash Park, 120 Meadow Ln',
          startsAt: startsAt.toISOString(),
          status: 'proposed',
          note: 'Bring the zoomies!',
          createdAt: now.toISOString(),
        };
        db.datePlans.set(plan.id, plan);
        db.addMessage({
          id: db.nextId('msg'),
          matchId: match.id,
          senderId,
          kind: 'date_plan',
          datePlanId: plan.id,
          createdAt: now.toISOString(),
        });
        return `${db.requireUser(senderId).firstName} proposed a Play Date.`;
      }),
    simulateDateReply: () =>
      simulate(() => {
        const me = activeId();
        const open = [...db.datePlans.values()].find(
          (p) =>
            p.proposerId === me &&
            p.status === 'proposed' &&
            db.matches.some((m) => m.id === p.matchId),
        );
        if (!open) return 'You have no open Play Date plans.';
        const match = db.matches.find((m) => m.id === open.matchId)!;
        const otherId = match.userIds.find((id) => id !== me)!;
        db.datePlans.set(open.id, { ...open, status: 'accepted', respondedById: otherId });
        return `${db.requireUser(otherId).firstName} accepted your Play Date.`;
      }),
  };
}
