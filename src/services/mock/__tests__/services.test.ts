import { config } from '@/config';
import { awaitingResponseFrom } from '@/domain/datePlans';
import { AlreadyLikedError, QuotaExceededError, type Services } from '@/services/types';
import { SEED_VIEWER_ID } from '@/mocks/seed';
import { createMockServices, MockDb } from '..';

let db: MockDb;
let s: Services;

beforeEach(() => {
  db = new MockDb();
  s = createMockServices(db);
});

const stranger = () =>
  [...db.users.values()].find(
    (u) =>
      u.id !== SEED_VIEWER_ID &&
      !db.findMatch(SEED_VIEWER_ID, u.id) &&
      !db.likes.some((l) => l.fromUserId === u.id && l.toUserId === SEED_VIEWER_ID),
  )!;

describe('auth', () => {
  it('starts signed in as the seeded viewer, and signs out', async () => {
    expect(await s.auth.getSession()).toEqual({ userId: SEED_VIEWER_ID });
    await s.auth.signOut();
    expect(await s.auth.getSession()).toBeNull();
  });

  it('deleteAccount removes the user and their pets', async () => {
    await s.auth.deleteAccount();
    expect(await s.users.getById(SEED_VIEWER_ID)).toBeNull();
    expect(await s.pets.listByOwner(SEED_VIEWER_ID)).toEqual([]);
  });
});

describe('isolation', () => {
  it('returns copies, so callers cannot mutate stored state', async () => {
    const user = (await s.users.getById(SEED_VIEWER_ID))!;
    user.firstName = 'Mutated';
    expect((await s.users.getById(SEED_VIEWER_ID))!.firstName).not.toBe('Mutated');
  });
});

describe('discovery', () => {
  it('never returns the viewer, blocked users, or people already passed', async () => {
    const before = await s.discovery.getCandidates(SEED_VIEWER_ID);
    expect(before.some((c) => c.user.id === SEED_VIEWER_ID)).toBe(false);

    const [a, b] = before;
    await s.users.block(SEED_VIEWER_ID, a!.user.id);
    await s.discovery.pass(SEED_VIEWER_ID, b!.user.id);

    const after = (await s.discovery.getCandidates(SEED_VIEWER_ID)).map((c) => c.user.id);
    expect(after).not.toContain(a!.user.id);
    expect(after).not.toContain(b!.user.id);
  });

  it('brings a skipped profile back after unpass', async () => {
    const [first] = await s.discovery.getCandidates(SEED_VIEWER_ID);
    await s.discovery.pass(SEED_VIEWER_ID, first!.user.id);
    const ids = (await s.discovery.getCandidates(SEED_VIEWER_ID)).map((c) => c.user.id);
    expect(ids).not.toContain(first!.user.id);
    await s.discovery.unpass(SEED_VIEWER_ID, first!.user.id);
    const after = (await s.discovery.getCandidates(SEED_VIEWER_ID)).map((c) => c.user.id);
    expect(after).toContain(first!.user.id);
  });

  it('includes pets, distance and a compatibility result with each candidate', async () => {
    const list = await s.discovery.getCandidates(SEED_VIEWER_ID);
    expect(list.length).toBeGreaterThanOrEqual(10);
    const owner = list.find((c) => c.user.kind === 'pet_owner')!;
    expect(owner.pets.length).toBeGreaterThan(0);
    list.forEach((c) => {
      expect(c.distanceMiles).toBeGreaterThanOrEqual(0);
      expect(c.compatibility.score).toBeGreaterThanOrEqual(0);
      expect(c.compatibility.score).toBeLessThanOrEqual(100);
    });
  });

  it('only shows people the viewer and they both fit (orientation, age, distance)', async () => {
    const list = await s.discovery.getCandidates(SEED_VIEWER_ID);
    const me = db.requireUser(SEED_VIEWER_ID);
    list.forEach((c) => {
      expect(me.interestedIn).toContain(c.user.gender);
      expect(c.user.interestedIn).toContain(me.gender);
      expect(c.distanceMiles).toBeLessThanOrEqual(me.preferences.maxDistanceMiles);
    });
  });

  it('flags people who already liked the viewer and ranks them near the top', async () => {
    const [incoming] = await s.likes.listIncoming(SEED_VIEWER_ID);
    const list = await s.discovery.getCandidates(SEED_VIEWER_ID);
    const admirers = list.filter((c) => c.likedYou);
    expect(admirers.length).toBeGreaterThan(0);
    const idx = list.findIndex((c) => c.user.id === incoming!.fromUserId);
    expect(idx).toBeGreaterThanOrEqual(0);
    expect(idx).toBeLessThan(admirers.length + 3);
    expect(list[idx]!.likedYou).toEqual({ isTreat: true });
  });

  it('respects a dealbreaker set by the OTHER person', async () => {
    const [first] = await s.discovery.getCandidates(SEED_VIEWER_ID);
    // They now refuse anyone who owns a dog (the viewer has a dog).
    await s.users.update(first!.user.id, {
      dealbreakers: { ...first!.user.dealbreakers, petNotGoodWith: ['dog'] },
    });
    const after = (await s.discovery.getCandidates(SEED_VIEWER_ID)).map((c) => c.user.id);
    expect(after).not.toContain(first!.user.id);
  });

  it('hides paused accounts', async () => {
    const [first] = await s.discovery.getCandidates(SEED_VIEWER_ID);
    await s.users.setPaused(first!.user.id, true);
    const after = (await s.discovery.getCandidates(SEED_VIEWER_ID)).map((c) => c.user.id);
    expect(after).not.toContain(first!.user.id);
  });

  it('never shows someone again after a like or a pass', async () => {
    const [a, b] = await s.discovery.getCandidates(SEED_VIEWER_ID);
    await s.likes.send({
      fromUserId: SEED_VIEWER_ID,
      toUserId: a!.user.id,
      target: { type: 'photo', id: a!.user.photos[0]!.id },
    });
    await s.discovery.pass(SEED_VIEWER_ID, b!.user.id);
    const after = (await s.discovery.getCandidates(SEED_VIEWER_ID)).map((c) => c.user.id);
    expect(after).not.toContain(a!.user.id);
    expect(after).not.toContain(b!.user.id);
  });
});

describe('likes', () => {
  it('enforces the daily like limit', async () => {
    const targets = [...db.users.values()].filter((u) => u.id !== SEED_VIEWER_ID);
    for (let i = 0; i < config.dailyLikeLimit; i++) {
      await s.likes.send({
        fromUserId: SEED_VIEWER_ID,
        toUserId: targets[i]!.id,
        target: { type: 'photo', id: targets[i]!.photos[0]!.id },
      });
    }
    const quota = await s.likes.getQuota(SEED_VIEWER_ID);
    expect(quota.likesRemaining).toBe(0);
    await expect(
      s.likes.send({
        fromUserId: SEED_VIEWER_ID,
        toUserId: targets[20]!.id,
        target: { type: 'photo', id: targets[20]!.photos[0]!.id },
      }),
    ).rejects.toBeInstanceOf(QuotaExceededError);
  });

  it('allows one Treat per day, separate from regular likes', async () => {
    const [a, b] = [...db.users.values()].filter((u) => u.id !== SEED_VIEWER_ID);
    const send = (to: typeof a, isTreat: boolean) =>
      s.likes.send({
        fromUserId: SEED_VIEWER_ID,
        toUserId: to!.id,
        target: { type: 'photo', id: to!.photos[0]!.id },
        isTreat,
      });
    await send(a, true);
    expect((await s.likes.getQuota(SEED_VIEWER_ID)).treatAvailable).toBe(false);
    await expect(send(b, true)).rejects.toBeInstanceOf(QuotaExceededError);
    await expect(send(b, false)).resolves.toBeDefined();
  });

  it('creates a match when a like is returned, and clears it from Likes You', async () => {
    const [incoming] = await s.likes.listIncoming(SEED_VIEWER_ID);
    const sender = (await s.users.getById(incoming!.fromUserId))!;
    const result = await s.likes.send({
      fromUserId: SEED_VIEWER_ID,
      toUserId: sender.id,
      target: { type: 'photo', id: sender.photos[0]!.id },
    });
    expect(result.match?.userIds).toEqual([SEED_VIEWER_ID, sender.id]);
    const remaining = await s.likes.listIncoming(SEED_VIEWER_ID);
    expect(remaining.map((l) => l.id)).not.toContain(incoming!.id);
  });

  it('does not match on a one-way like', async () => {
    const other = stranger();
    const result = await s.likes.send({
      fromUserId: SEED_VIEWER_ID,
      toUserId: other.id,
      target: { type: 'photo', id: other.photos[0]!.id },
    });
    expect(result.match).toBeNull();
  });

  it('lists Treats first, then newest, and hides removed likes', async () => {
    const incoming = await s.likes.listIncoming(SEED_VIEWER_ID);
    expect(incoming[0]!.isTreat).toBe(true);
    await s.likes.remove(incoming[1]!.id);
    expect((await s.likes.listIncoming(SEED_VIEWER_ID)).map((l) => l.id)).not.toContain(
      incoming[1]!.id,
    );
  });
});

describe('matches and chat', () => {
  it('flags "your turn" when the other person spoke last', async () => {
    const list = await s.matches.list(SEED_VIEWER_ID);
    expect(list).toHaveLength(3);
    expect(list.filter((m) => m.yourTurn)).toHaveLength(1);
    expect(list.filter((m) => m.isNew)).toHaveLength(1);
  });

  it('delivers sent messages to subscribers and flips the turn', async () => {
    const { match, otherUserId } = (await s.matches.list(SEED_VIEWER_ID)).find((m) => m.yourTurn)!;
    const received: string[] = [];
    const unsubscribe = s.chat.subscribe(match.id, (m) => received.push(m.text ?? ''));
    await s.chat.sendText(match.id, SEED_VIEWER_ID, '  On my way!  ');
    unsubscribe();
    await s.chat.sendText(match.id, SEED_VIEWER_ID, 'ignored');
    expect(received).toEqual(['On my way!']);
    const after = (await s.matches.list(SEED_VIEWER_ID)).find(
      (m) => m.otherUserId === otherUserId,
    )!;
    expect(after.yourTurn).toBe(false);
  });

  it('supports proposing and responding to a play date', async () => {
    const { match } = (await s.matches.list(SEED_VIEWER_ID))[0]!;
    const { plan, message } = await s.chat.proposeDate({
      matchId: match.id,
      proposerId: SEED_VIEWER_ID,
      kind: 'dog_park',
      location: '120 Meadow Ln',
      startsAt: '2026-10-10T17:00:00.000Z',
    });
    expect(plan.location).toBe('120 Meadow Ln');
    expect(message.kind).toBe('date_plan');
    expect(plan.status).toBe('proposed');
    const other = match.userIds.find((id) => id !== SEED_VIEWER_ID)!;
    const accepted = await s.chat.respondToDatePlan(plan.id, 'accepted', { responderId: other });
    expect(accepted.status).toBe('accepted');
    expect(accepted.respondedById).toBe(other);
  });

  it('records who suggested a change, so the other person answers next', async () => {
    const { match } = (await s.matches.list(SEED_VIEWER_ID))[0]!;
    const other = match.userIds.find((id) => id !== SEED_VIEWER_ID)!;
    const { plan } = await s.chat.proposeDate({
      matchId: match.id,
      proposerId: SEED_VIEWER_ID,
      kind: 'custom',
      customLabel: 'Puppy yoga',
      startsAt: '2026-10-10T17:00:00.000Z',
    });
    const changed = await s.chat.respondToDatePlan(plan.id, 'change_suggested', {
      responderId: other,
      newStartsAt: '2026-10-11T11:00:00.000Z',
      note: 'Sunday works better',
    });
    expect(changed).toMatchObject({
      status: 'change_suggested',
      respondedById: other,
      startsAt: '2026-10-11T11:00:00.000Z',
      note: 'Sunday works better',
    });
    expect(awaitingResponseFrom(changed, match.userIds)).toBe(SEED_VIEWER_ID);
  });

  it('editing a plan resets it to proposed; deleting removes the plan and its chat card', async () => {
    const { match } = (await s.matches.list(SEED_VIEWER_ID))[0]!;
    const other = match.userIds.find((id) => id !== SEED_VIEWER_ID)!;
    const { plan } = await s.chat.proposeDate({
      matchId: match.id,
      proposerId: SEED_VIEWER_ID,
      kind: 'beach',
      startsAt: '2026-10-10T17:00:00.000Z',
    });
    await s.chat.respondToDatePlan(plan.id, 'accepted', { responderId: other });

    const edited = await s.chat.updateDatePlan(plan.id, SEED_VIEWER_ID, {
      kind: 'custom',
      customLabel: 'Puppy yoga',
      location: '5 Pine St',
      startsAt: '2026-10-12T11:00:00.000Z',
    });
    expect(edited).toMatchObject({
      kind: 'custom',
      customLabel: 'Puppy yoga',
      location: '5 Pine St',
      status: 'proposed',
      proposerId: SEED_VIEWER_ID,
    });
    expect(edited.respondedById).toBeUndefined();
    await expect(
      s.chat.updateDatePlan(plan.id, other, { kind: 'beach', startsAt: edited.startsAt }),
    ).rejects.toThrow();

    await expect(s.chat.deleteDatePlan(plan.id, other)).rejects.toThrow();
    await s.chat.deleteDatePlan(plan.id, SEED_VIEWER_ID);
    expect(await s.chat.getDatePlan(plan.id)).toBeNull();
    expect((await s.chat.listMessages(match.id)).some((m) => m.datePlanId === plan.id)).toBe(false);
  });

  it('unmatch removes the match and its messages; block does too', async () => {
    const [first, second] = await s.matches.list(SEED_VIEWER_ID);
    await s.matches.unmatch(first!.match.id);
    expect(await s.chat.listMessages(first!.match.id)).toEqual([]);
    await s.users.block(SEED_VIEWER_ID, second!.otherUserId);
    expect((await s.matches.list(SEED_VIEWER_ID)).map((m) => m.match.id)).not.toContain(
      second!.match.id,
    );
  });
});

describe('preferences', () => {
  it('a "show animal lovers" dealbreaker and a tight distance change who Discover returns', async () => {
    const before = await s.discovery.getCandidates(SEED_VIEWER_ID);
    expect(before.some((c) => c.user.kind === 'pet_owner')).toBe(true);

    const me = (await s.users.getById(SEED_VIEWER_ID))!;
    await s.users.update(SEED_VIEWER_ID, {
      preferences: { ...me.preferences, show: 'animal_lovers' },
      dealbreakers: { ...me.dealbreakers, show: true },
    });
    const lovers = await s.discovery.getCandidates(SEED_VIEWER_ID);
    expect(lovers.every((c) => c.user.kind === 'animal_lover')).toBe(true);

    await s.users.update(SEED_VIEWER_ID, {
      preferences: { ...me.preferences, maxDistanceMiles: 5 },
      dealbreakers: me.dealbreakers,
    });
    const near = await s.discovery.getCandidates(SEED_VIEWER_ID);
    expect(near.every((c) => c.distanceMiles <= 5)).toBe(true);
    expect(near.length).toBeLessThan(before.length);
  });
});

describe('seeded likes', () => {
  it("each one targets something that exists on the viewer's own profile", async () => {
    const mine = db.profileOf(SEED_VIEWER_ID);
    const likes = await s.likes.listIncoming(SEED_VIEWER_ID);
    expect(likes.length).toBeGreaterThan(0);
    for (const like of likes) {
      const ids =
        like.target.type === 'photo'
          ? mine.user.photos.map((p) => p.id)
          : like.target.type === 'prompt'
            ? mine.user.promptAnswers.map((a) => a.id)
            : mine.pets.map((p) => p.id);
      expect(ids).toContain(like.target.id);
    }
  });
});

describe('like back', () => {
  it('matches without spending a daily like and clears the like from Likes You', async () => {
    const [like] = await s.likes.listIncoming(SEED_VIEWER_ID);
    const before = await s.likes.getQuota(SEED_VIEWER_ID);
    const match = await s.likes.likeBack(like!.id, SEED_VIEWER_ID);
    expect(match.userIds).toEqual(expect.arrayContaining([SEED_VIEWER_ID, like!.fromUserId]));
    expect((await s.likes.getQuota(SEED_VIEWER_ID)).likesRemaining).toBe(before.likesRemaining);
    expect((await s.likes.listIncoming(SEED_VIEWER_ID)).map((l) => l.id)).not.toContain(like!.id);
    expect((await s.matches.list(SEED_VIEWER_ID)).map((m) => m.match.id)).toContain(match.id);
  });

  it('is idempotent and refuses removed likes', async () => {
    const [first, second] = await s.likes.listIncoming(SEED_VIEWER_ID);
    const a = await s.likes.likeBack(first!.id, SEED_VIEWER_ID);
    expect((await s.likes.likeBack(first!.id, SEED_VIEWER_ID)).id).toBe(a.id);
    await s.likes.remove(second!.id);
    await expect(s.likes.likeBack(second!.id, SEED_VIEWER_ID)).rejects.toThrow();
  });
});

describe('blocking', () => {
  it('removes the match and its messages, and unblock lists/clears the block', async () => {
    const { match, otherUserId } = (await s.matches.list(SEED_VIEWER_ID)).find(
      (m) => m.lastMessage,
    )!;
    await s.users.block(SEED_VIEWER_ID, otherUserId);
    expect(await s.chat.listMessages(match.id)).toEqual([]);
    expect(await s.users.listBlockedIds(SEED_VIEWER_ID)).toEqual([otherUserId]);
    await s.users.unblock(SEED_VIEWER_ID, otherUserId);
    expect(await s.users.listBlockedIds(SEED_VIEWER_ID)).toEqual([]);
  });
});

describe('reports', () => {
  it('stores a report with its reason', async () => {
    const report = await s.users.report({
      reporterId: SEED_VIEWER_ID,
      reportedId: stranger().id,
      reason: 'spam',
    });
    expect(report.reason).toBe('spam');
    expect(db.reports).toHaveLength(1);
  });
});

describe('dev tools', () => {
  it('switches the active user and resets to the seed', async () => {
    const other = stranger();
    await s.dev!.switchUser(other.id);
    expect(await s.auth.getSession()).toEqual({ userId: other.id });
    await s.dev!.reset();
    expect(await s.auth.getSession()).toEqual({ userId: SEED_VIEWER_ID });
  });

  it('simulated like, match and message change state', async () => {
    const likesBefore = (await s.likes.listIncoming(SEED_VIEWER_ID)).length;
    await s.dev!.simulateIncomingLike();
    expect((await s.likes.listIncoming(SEED_VIEWER_ID)).length).toBe(likesBefore + 1);

    const matchesBefore = (await s.matches.list(SEED_VIEWER_ID)).length;
    await s.dev!.simulateNewMatch();
    expect((await s.matches.list(SEED_VIEWER_ID)).length).toBe(matchesBefore + 1);

    const messagesBefore = db.messages.length;
    await s.dev!.simulateIncomingMessage();
    expect(db.messages.length).toBe(messagesBefore + 1);
  });
});

describe('sign up', () => {
  it('creates a bare, incomplete account and signs in as it', async () => {
    const session = await s.auth.signUp({ email: 'new@example.com' });
    expect(session.userId).not.toBe(SEED_VIEWER_ID);
    const user = (await s.users.getById(session.userId))!;
    expect(user.onboardingComplete).toBe(false);
    expect(user.onboardingSteps).toEqual([]);
    expect(await s.auth.getSession()).toEqual(session);
  });

  it('keeps new users out of Discover until onboarding completes', async () => {
    const { userId } = await s.auth.signUp({ phone: '+15555550100' });
    await s.dev!.switchUser(SEED_VIEWER_ID);
    const ids = (await s.discovery.getCandidates(SEED_VIEWER_ID)).map((c) => c.user.id);
    expect(ids).not.toContain(userId);
  });
});

describe('accounts and self-exclusion', () => {
  it('never shows anyone their own profile in Discover (every user, including new sign-ups)', async () => {
    const { userId } = await s.auth.signUp({ email: 'me@example.com' });
    await s.users.update(userId, { onboardingComplete: true, firstName: 'Me' });
    for (const id of db.users.keys()) {
      const ids = (await s.discovery.getCandidates(id)).map((c) => c.user.id);
      expect(ids).not.toContain(id);
    }
  });

  it('logging back in returns YOUR account, not the demo user', async () => {
    const created = await s.auth.signUp({ email: 'Me@Example.com' });
    await s.auth.signOut();
    const session = await s.auth.signIn({ email: ' me@example.com ' });
    expect(session.userId).toBe(created.userId);
    expect(session.userId).not.toBe(SEED_VIEWER_ID);
  });

  it('matches phone numbers regardless of formatting', async () => {
    const created = await s.auth.signUp({ phone: '(415) 555-0123' });
    await s.auth.signOut();
    expect((await s.auth.signIn({ phone: '+1 415 555 0123' })).userId).toBe(created.userId);
  });

  it('rejects unknown logins and duplicate sign-ups', async () => {
    await s.auth.signOut();
    await expect(s.auth.signIn({ email: 'nobody@example.com' })).rejects.toThrow(/no account/i);
    await expect(s.auth.signUp({ email: 'melody@example.com' })).rejects.toThrow(/already/i);
  });

  it('the demo account logs in as the seeded viewer', async () => {
    await s.auth.signOut();
    expect((await s.auth.signIn({ email: 'melody@example.com' })).userId).toBe(SEED_VIEWER_ID);
  });

  it('deleting an account frees its login', async () => {
    await s.auth.signUp({ email: 'gone@example.com' });
    await s.auth.deleteAccount();
    await expect(s.auth.signIn({ email: 'gone@example.com' })).rejects.toThrow(/no account/i);
  });
});

describe('likes: comments, duplicates and limits', () => {
  const target = async () => {
    const [c] = await s.discovery.getCandidates(SEED_VIEWER_ID);
    return c!.user;
  };

  it('keeps the comment and target, trimming whitespace and dropping empty comments', async () => {
    const u = await target();
    const { like } = await s.likes.send({
      fromUserId: SEED_VIEWER_ID,
      toUserId: u.id,
      target: { type: 'photo', id: u.photos[0]!.id },
      comment: '  Love this shot  ',
    });
    expect(like.comment).toBe('Love this shot');
    expect(like.target).toEqual({ type: 'photo', id: u.photos[0]!.id });

    const [, second] = await s.discovery.getCandidates(SEED_VIEWER_ID);
    const { like: bare } = await s.likes.send({
      fromUserId: SEED_VIEWER_ID,
      toUserId: second!.user.id,
      target: { type: 'photo', id: second!.user.photos[0]!.id },
      comment: '   ',
    });
    expect(bare.comment).toBeUndefined();
  });

  it('can like a prompt or a pet specifically', async () => {
    const [a, b] = await s.discovery.getCandidates(SEED_VIEWER_ID);
    const prompt = a!.user.promptAnswers[0]!;
    const r1 = await s.likes.send({
      fromUserId: SEED_VIEWER_ID,
      toUserId: a!.user.id,
      target: { type: 'prompt', id: prompt.id },
    });
    expect(r1.like.target).toEqual({ type: 'prompt', id: prompt.id });
    const withPet = [b!, ...(await s.discovery.getCandidates(SEED_VIEWER_ID))].find(
      (c) => c.pets.length,
    )!;
    const r2 = await s.likes.send({
      fromUserId: SEED_VIEWER_ID,
      toUserId: withPet.user.id,
      target: { type: 'pet', id: withPet.pets[0]!.id },
    });
    expect(r2.like.target.type).toBe('pet');
  });

  it('refuses a second like to the same person, and a like to yourself', async () => {
    const u = await target();
    const input = {
      fromUserId: SEED_VIEWER_ID,
      toUserId: u.id,
      target: { type: 'photo' as const, id: u.photos[0]!.id },
    };
    await s.likes.send(input);
    await expect(s.likes.send(input)).rejects.toBeInstanceOf(AlreadyLikedError);
    await expect(s.likes.send({ ...input, toUserId: SEED_VIEWER_ID })).rejects.toThrow(/yourself/);
  });

  it('a rejected like does not use up the quota', async () => {
    const u = await target();
    const input = {
      fromUserId: SEED_VIEWER_ID,
      toUserId: u.id,
      target: { type: 'photo' as const, id: u.photos[0]!.id },
    };
    await s.likes.send(input);
    const before = (await s.likes.getQuota(SEED_VIEWER_ID)).likesRemaining;
    await expect(s.likes.send(input)).rejects.toBeDefined();
    expect((await s.likes.getQuota(SEED_VIEWER_ID)).likesRemaining).toBe(before);
  });

  it('counts down from the configured daily limit and reports when it resets', async () => {
    const q0 = await s.likes.getQuota(SEED_VIEWER_ID);
    expect(q0.likesRemaining).toBe(config.dailyLikeLimit);
    expect(q0.treatAvailable).toBe(true);
    expect(new Date(q0.resetsAt).getTime()).toBeGreaterThan(Date.now());
    const u = await target();
    await s.likes.send({
      fromUserId: SEED_VIEWER_ID,
      toUserId: u.id,
      target: { type: 'photo', id: u.photos[0]!.id },
    });
    expect((await s.likes.getQuota(SEED_VIEWER_ID)).likesRemaining).toBe(config.dailyLikeLimit - 1);
  });

  it('a Treat shows at the top of the recipient’s Likes You, ahead of newer likes', async () => {
    // Two strangers (not admirers, or liking them back would create a match).
    const [a, b] = (await s.discovery.getCandidates(SEED_VIEWER_ID)).filter((c) => !c.likedYou);
    // `b` likes `a` first (a regular like), then the viewer sends a Treat later.
    await s.dev!.switchUser(b!.user.id);
    const toA = (await s.users.getById(a!.user.id))!;
    await s.likes.send({
      fromUserId: b!.user.id,
      toUserId: toA.id,
      target: { type: 'photo', id: toA.photos[0]!.id },
    });
    await s.dev!.switchUser(SEED_VIEWER_ID);
    await s.likes.send({
      fromUserId: SEED_VIEWER_ID,
      toUserId: toA.id,
      target: { type: 'photo', id: toA.photos[0]!.id },
      isTreat: true,
    });
    const incoming = await s.likes.listIncoming(toA.id);
    expect(incoming[0]!.fromUserId).toBe(SEED_VIEWER_ID);
    expect(incoming[0]!.isTreat).toBe(true);
  });

  it('the Dev Menu quota override spends down and clears', async () => {
    await s.dev!.setQuota({ likes: 1, treatAvailable: true });
    const u = await target();
    await s.likes.send({
      fromUserId: SEED_VIEWER_ID,
      toUserId: u.id,
      target: { type: 'photo', id: u.photos[0]!.id },
    });
    expect((await s.likes.getQuota(SEED_VIEWER_ID)).likesRemaining).toBe(0);
    const [next] = await s.discovery.getCandidates(SEED_VIEWER_ID);
    await expect(
      s.likes.send({
        fromUserId: SEED_VIEWER_ID,
        toUserId: next!.user.id,
        target: { type: 'photo', id: next!.user.photos[0]!.id },
      }),
    ).rejects.toBeInstanceOf(QuotaExceededError);
    await s.dev!.setQuota(null);
    expect((await s.likes.getQuota(SEED_VIEWER_ID)).likesRemaining).toBe(config.dailyLikeLimit - 1);
  });
});
