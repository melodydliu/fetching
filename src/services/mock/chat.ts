import type { DatePlan, Message } from '@/domain/types';
import type { ChatRepository } from '../types';
import { MockDb, simulate } from './db';

export function createMockChat(db: MockDb): ChatRepository {
  return {
    listMessages: (matchId) =>
      simulate(() =>
        db.messages
          .filter((m) => m.matchId === matchId)
          .sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
      ),
    sendText: (matchId, senderId, text) =>
      simulate(() => {
        const message: Message = {
          id: db.nextId('msg'),
          matchId,
          senderId,
          kind: 'text',
          text: text.trim(),
          createdAt: new Date().toISOString(),
        };
        db.addMessage(message);
        return message;
      }),
    markRead: (matchId, readerId) =>
      simulate(() => {
        const now = new Date().toISOString();
        db.messages.forEach((m) => {
          if (m.matchId === matchId && m.senderId !== readerId && !m.readAt) m.readAt = now;
        });
      }),
    subscribe: (matchId, onMessage) =>
      db.subscribe((message) => {
        if (message.matchId === matchId) onMessage(JSON.parse(JSON.stringify(message)) as Message);
      }),
    setTyping: async (matchId, userId, typing) => db.setTyping(matchId, userId, typing),
    subscribeTyping: (matchId, onTyping) => {
      db.typing.get(matchId)?.forEach((userId) => onTyping(userId, true));
      return db.subscribeTyping((id, userId, typing) => {
        if (id === matchId) onTyping(userId, typing);
      });
    },
    proposeDate: (input) =>
      simulate(() => {
        const now = new Date().toISOString();
        const plan: DatePlan = {
          ...input,
          id: db.nextId('plan'),
          status: 'proposed',
          createdAt: now,
        };
        db.datePlans.set(plan.id, plan);
        const message: Message = {
          id: db.nextId('msg'),
          matchId: input.matchId,
          senderId: input.proposerId,
          kind: 'date_plan',
          datePlanId: plan.id,
          createdAt: now,
        };
        db.addMessage(message);
        return { plan, message };
      }),
    getDatePlan: (planId) => simulate(() => db.datePlans.get(planId) ?? null),
    updateDatePlan: (planId, editorId, input) =>
      simulate(() => {
        const plan = db.datePlans.get(planId);
        if (!plan) throw new Error(`Date plan not found: ${planId}`);
        if (plan.proposerId !== editorId)
          throw new Error('Only the person who planned it can edit');
        const next: DatePlan = {
          id: plan.id,
          matchId: plan.matchId,
          proposerId: plan.proposerId,
          createdAt: plan.createdAt,
          kind: input.kind,
          customLabel: input.kind === 'custom' ? input.customLabel : undefined,
          location: input.location,
          startsAt: input.startsAt,
          note: input.note,
          status: 'proposed',
          respondedById: undefined,
        };
        db.datePlans.set(planId, next);
        return next;
      }),
    deleteDatePlan: (planId, deleterId) =>
      simulate(() => {
        const plan = db.datePlans.get(planId);
        if (!plan) return;
        if (plan.proposerId !== deleterId)
          throw new Error('Only the person who planned it can delete');
        db.datePlans.delete(planId);
        db.messages = db.messages.filter((m) => m.datePlanId !== planId);
      }),
    respondToDatePlan: (planId, response, options) =>
      simulate(() => {
        const plan = db.datePlans.get(planId);
        if (!plan) throw new Error(`Date plan not found: ${planId}`);
        const next: DatePlan = {
          ...plan,
          status: response,
          respondedById: options.responderId,
          note: options.note ?? plan.note,
          startsAt: options.newStartsAt ?? plan.startsAt,
        };
        db.datePlans.set(planId, next);
        return next;
      }),
  };
}
