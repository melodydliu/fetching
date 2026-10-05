import type { UserRepository } from '../types';
import { MockDb, simulate } from './db';

export function createMockUsers(db: MockDb): UserRepository {
  return {
    getById: (id) => simulate(() => db.users.get(id) ?? null),
    getMany: (ids) => simulate(() => ids.flatMap((id) => db.users.get(id) ?? [])),
    create: (input) =>
      simulate(() => {
        const now = new Date().toISOString();
        const user = { ...input, id: db.nextId('u'), createdAt: now, lastActiveAt: now };
        db.users.set(user.id, user);
        return user;
      }),
    update: (id, patch) =>
      simulate(() => {
        const next = { ...db.requireUser(id), ...patch };
        db.users.set(id, next);
        return next;
      }),
    setPaused: (id, paused) =>
      simulate(() => {
        const next = { ...db.requireUser(id), paused };
        db.users.set(id, next);
        return next;
      }),
    block: (blockerId, blockedId) =>
      simulate(() => {
        if (!db.blocks.some((b) => b.blockerId === blockerId && b.blockedId === blockedId)) {
          db.blocks.push({ blockerId, blockedId });
        }
        db.matches = db.matches.filter(
          (m) => !(m.userIds.includes(blockerId) && m.userIds.includes(blockedId)),
        );
      }),
    unblock: (blockerId, blockedId) =>
      simulate(() => {
        db.blocks = db.blocks.filter(
          (b) => !(b.blockerId === blockerId && b.blockedId === blockedId),
        );
      }),
    listBlockedIds: (userId) =>
      simulate(() => db.blocks.filter((b) => b.blockerId === userId).map((b) => b.blockedId)),
    report: (input) =>
      simulate(() => {
        const report = { ...input, id: db.nextId('report'), createdAt: new Date().toISOString() };
        db.reports.push(report);
        return report;
      }),
  };
}
