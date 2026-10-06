/**
 * Live test (REAL project, throwaway accounts, self-cleaning) of chat: messages, read
 * receipts, Realtime delivery, the private typing channel (including an outsider trying to
 * listen in), and Play Date plans. Run it with:
 *
 *   set -a; source .env.local; set +a; RUN_LIVE_TESTS=1 npx jest src/services/supabase/__tests__/live.chat
 */
import type { Match, Message } from '@/domain/types';
import {
  cleanupLiveUsers,
  finishLiveProfile,
  installLiveFetch,
  LIVE,
  type LiveUser,
  matchLiveUsers,
  nextEvent,
  OAKLAND,
  SF,
  signUpLiveUser,
} from '@/test/liveSupport';

jest.mock('@react-native-async-storage/async-storage', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

installLiveFetch();

const live = LIVE ? describe : describe.skip;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const inDays = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString();

live('chat (live)', () => {
  jest.setTimeout(120_000);
  let a: LiveUser;
  let b: LiveUser;
  let outsider: LiveUser;
  let match: Match;

  beforeAll(async () => {
    [a, b, outsider] = await Promise.all([
      signUpLiveUser('chat-a'),
      signUpLiveUser('chat-b'),
      signUpLiveUser('chat-c'),
    ]);
    await finishLiveProfile(a, 'Ada', 'woman', ['man'], SF);
    await finishLiveProfile(b, 'Ben', 'man', ['woman'], OAKLAND);
    match = await matchLiveUsers(a, b);
  });

  afterAll(async () => {
    await cleanupLiveUsers(a, b, outsider);
  });

  it('sends messages, lists them in order, and the Matches list reflects whose turn it is', async () => {
    await a.services.chat.sendText(match.id, a.id, '  Hi Ben!  ');
    await a.services.chat.sendText(match.id, a.id, 'Is Biscuit free Saturday?');
    const seenByB = await b.services.chat.listMessages(match.id);
    expect(seenByB.map((m) => m.text)).toEqual(['Hi Ben!', 'Is Biscuit free Saturday?']);
    expect(seenByB.every((m) => m.kind === 'text' && !m.readAt)).toBe(true);

    expect((await b.services.matches.list(b.id))[0]).toMatchObject({
      yourTurn: true,
      isNew: false,
    });
    expect((await a.services.matches.list(a.id))[0]).toMatchObject({ yourTurn: false });
  });

  it('only the recipient can mark messages read', async () => {
    await a.services.chat.markRead(match.id, a.id); // sender: no effect
    expect((await b.services.chat.listMessages(match.id)).some((m) => m.readAt)).toBe(false);
    await b.services.chat.markRead(match.id, b.id);
    expect((await a.services.chat.listMessages(match.id)).every((m) => m.readAt)).toBe(true);
  });

  it('outsiders cannot read or post in the chat', async () => {
    expect(await outsider.services.chat.listMessages(match.id)).toEqual([]);
    await expect(outsider.services.chat.sendText(match.id, outsider.id, 'hi')).rejects.toThrow();
  });

  it('delivers new messages in real time to the other person', async () => {
    let ready!: () => void;
    const live = new Promise<void>((r) => (ready = r));
    const arrived = nextEvent<Message>((cb) => b.services.chat.subscribe(match.id, cb, ready));
    await live; // the subscription is really joined
    await a.services.chat.sendText(match.id, a.id, 'See you there');
    const message = await arrived;
    expect(message).toMatchObject({ text: 'See you there', senderId: a.id, matchId: match.id });
  });

  it('shows the other person typing (private channel), and an outsider hears nothing', async () => {
    const heard: [string, boolean][] = [];
    const offB = b.services.chat.subscribeTyping(match.id, (u, t) => heard.push([u, t]));

    // Attacker 1: joins the same typing channel the normal (private) way.
    const spy: [string, boolean][] = [];
    const offSpy = outsider.services.chat.subscribeTyping(match.id, (u, t) => spy.push([u, t]));
    // Attacker 2: skips `private`, hoping a public channel with the same name receives it.
    const publicSpy: unknown[] = [];
    const sneaky = outsider.client
      .channel(`typing:${match.id}`)
      .on('broadcast', { event: 'typing' }, (p) => publicSpy.push(p))
      .subscribe();
    await sleep(2500);

    await a.services.chat.setTyping(match.id, a.id, true);
    await sleep(2500);
    await a.services.chat.setTyping(match.id, a.id, false);
    await sleep(2500);

    expect(heard).toEqual([
      [a.id, true],
      [a.id, false],
    ]);
    expect(spy).toEqual([]);
    expect(publicSpy).toEqual([]);

    offB();
    offSpy();
    await outsider.client.removeChannel(sneaky);
  });

  it('plans a Play Date: card in the chat, answer, suggest a change, edit, delete', async () => {
    let ready!: () => void;
    const live = new Promise<void>((r) => (ready = r));
    const arrived = nextEvent<Message>((cb) => b.services.chat.subscribe(match.id, cb, ready));
    await live;
    const { plan, message } = await a.services.chat.proposeDate({
      matchId: match.id,
      proposerId: a.id,
      kind: 'dog_park',
      location: 'Sunny Meadow Park',
      startsAt: inDays(3),
      note: 'Bring the zoomies',
    });
    expect(plan).toMatchObject({
      status: 'proposed',
      proposerId: a.id,
      location: 'Sunny Meadow Park',
    });
    expect(message).toMatchObject({ kind: 'date_plan', datePlanId: plan.id, senderId: a.id });
    expect((await arrived).datePlanId).toBe(plan.id);

    // Ben accepts: recorded as his answer.
    const accepted = await b.services.chat.respondToDatePlan(plan.id, 'accepted', {
      responderId: b.id,
    });
    expect(accepted).toMatchObject({ status: 'accepted', respondedById: b.id });
    expect((await a.services.chat.getDatePlan(plan.id))?.status).toBe('accepted');

    // Ben can't rewrite the details or delete it.
    await expect(
      b.client.from('date_plans').update({ location: 'Elsewhere' }).eq('id', plan.id).select(),
    ).resolves.toMatchObject({
      error: expect.objectContaining({
        message: expect.stringContaining('only the person who planned'),
      }),
    });
    await expect(b.services.chat.deleteDatePlan(plan.id, b.id)).rejects.toThrow(/planned it/);

    // Ben suggests a new time, with a note.
    const later = inDays(4);
    const changed = await b.services.chat.respondToDatePlan(plan.id, 'change_suggested', {
      responderId: b.id,
      newStartsAt: later,
      note: 'Later works better for Biscuit',
    });
    expect(changed).toMatchObject({ status: 'change_suggested', respondedById: b.id });
    expect(new Date(changed.startsAt).toISOString()).toBe(new Date(later).toISOString());
    expect(changed.note).toBe('Later works better for Biscuit');

    // Ada edits it: back to "proposed", waiting on Ben again.
    const edited = await a.services.chat.updateDatePlan(plan.id, a.id, {
      kind: 'custom',
      customLabel: 'Picnic',
      location: 'Lake Merritt',
      startsAt: later,
    });
    expect(edited).toMatchObject({ status: 'proposed', kind: 'custom', customLabel: 'Picnic' });
    expect(edited.respondedById).toBeUndefined();

    // Ada deletes it: the plan and its chat card are gone.
    await a.services.chat.deleteDatePlan(plan.id, a.id);
    expect(await a.services.chat.getDatePlan(plan.id)).toBeNull();
    expect((await b.services.chat.listMessages(match.id)).some((m) => m.kind === 'date_plan')).toBe(
      false,
    );
  });
});
