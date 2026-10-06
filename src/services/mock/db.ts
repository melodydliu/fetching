import { config } from '@/config';
import type {
  DatePlan,
  ID,
  Like,
  Match,
  Message,
  Pet,
  Profile,
  Report,
  User,
} from '@/domain/types';
import { applyHardFilters } from '@/domain/matching';
import { distanceMiles } from '@/domain/geo';
import { buildSeed, SEED_VIEWER_ID } from '@/mocks/seed';

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/** Deep copy so callers can never mutate "server" state by accident. */
export const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

export async function simulateLatency(): Promise<void> {
  const [min, max] = config.mockLatencyMs;
  if (max === 0) return;
  await sleep(min + Math.random() * (max - min));
}

/** Runs `fn` after a simulated network delay and returns a defensive copy of the result. */
export async function simulate<T>(fn: () => T): Promise<T> {
  await simulateLatency();
  const result = fn();
  return result === undefined ? result : clone(result);
}

export const startOfTomorrow = (now = new Date()): Date => {
  const d = new Date(now);
  d.setHours(24, 0, 0, 0);
  return d;
};

export const isSameLocalDay = (iso: string, now = new Date()): boolean => {
  const d = new Date(iso);
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
};

/** One stable key per login, ignoring case, spacing and phone formatting. */
export function credentialKey(c: { phone: string } | { email: string }): string {
  if ('phone' in c) {
    // Drop a leading US country code so "+1 415…" and "415…" are the same login.
    const digits = c.phone.replace(/\D/g, '');
    return `phone:${digits.length === 11 && digits.startsWith('1') ? digits.slice(1) : digits}`;
  }
  return `email:${c.email.trim().toLowerCase()}`;
}

type MessageListener = (message: Message) => void;

/** In-memory "backend". One instance backs every mock service. */
export class MockDb {
  users = new Map<ID, User>();
  pets = new Map<ID, Pet>();
  likes: Like[] = [];
  removedLikeIds = new Set<ID>();
  passes = new Map<ID, Set<ID>>();
  matches: Match[] = [];
  messages: Message[] = [];
  datePlans = new Map<ID, DatePlan>();
  blocks: { blockerId: ID; blockedId: ID }[] = [];
  reports: Report[] = [];
  /** Normalized login (see `credentialKey`) -> user id. */
  accounts = new Map<string, ID>();
  /** Dev Menu override of today's remaining likes / Treat. */
  quotaOverride: { likes?: number; treatAvailable?: boolean } = {};
  sessionUserId: ID | null = null;
  private listeners = new Set<MessageListener>();
  private counter = 0;

  constructor() {
    this.reset();
  }

  nextId(prefix: string): ID {
    this.counter += 1;
    return `${prefix}-${Date.now().toString(36)}-${this.counter}`;
  }

  reset(): void {
    const { users, pets } = buildSeed(new Date());
    this.users = new Map(users.map((u) => [u.id, u]));
    this.pets = new Map(pets.map((p) => [p.id, p]));
    this.likes = [];
    this.removedLikeIds = new Set();
    this.passes = new Map();
    this.matches = [];
    this.messages = [];
    this.datePlans = new Map();
    this.blocks = [];
    this.reports = [];
    this.quotaOverride = {};
    this.sessionUserId = SEED_VIEWER_ID;
    this.accounts = new Map([[credentialKey({ email: config.demoAccountEmail }), SEED_VIEWER_ID]]);
    this.seedInteractions();
  }

  /** A believable starting state: some people already like the viewer, a few matches exist. */
  private seedInteractions(): void {
    const me = this.users.get(SEED_VIEWER_ID)!;
    const hoursAgo = (h: number) => new Date(Date.now() - h * 3600_000).toISOString();
    // Only people who would really appear for the viewer (mutual orientation, age, distance...),
    // so Likes You and Matches never contain someone Discover would never show.
    const viewer = { user: me, pets: [...this.pets.values()].filter((p) => p.ownerId === me.id) };
    const others = [...this.users.values()].filter((u) => {
      if (u.id === me.id) return false;
      const candidate = {
        user: u,
        pets: [...this.pets.values()].filter((p) => p.ownerId === u.id),
      };
      return applyHardFilters(viewer, candidate, {
        now: new Date(),
        distanceMiles: distanceMiles(me.location, u.location),
        excludedIds: new Set(),
      }).pass;
    });

    // Incoming likes (the first is a Treat). A like targets something on the *viewer's* profile.
    others.slice(0, 5).forEach((u, i) => {
      const prompt = me.promptAnswers[i % Math.max(me.promptAnswers.length, 1)];
      const pet = viewer.pets[0];
      const photo = me.photos[i % me.photos.length]!;
      this.likes.push({
        id: this.nextId('like'),
        fromUserId: u.id,
        toUserId: me.id,
        target:
          i % 2 === 0 && prompt
            ? { type: 'prompt', id: prompt.id }
            : i === 3 && pet
              ? { type: 'pet', id: pet.id }
              : { type: 'photo', id: photo.id },
        comment: i % 2 === 0 ? 'This made me laugh out loud.' : undefined,
        isTreat: i === 0,
        createdAt: hoursAgo(2 + i * 5),
      });
    });

    // Three existing matches: one waiting on the viewer, one waiting on them, one brand new.
    const matched = others.slice(5, 8);
    matched.forEach((u, i) => {
      const match: Match = {
        id: this.nextId('match'),
        userIds: [me.id, u.id],
        createdAt: hoursAgo(30 - i * 8),
      };
      this.matches.push(match);
      const say = (senderId: ID, text: string, h: number) =>
        this.messages.push({
          id: this.nextId('msg'),
          matchId: match.id,
          senderId,
          kind: 'text',
          text,
          createdAt: hoursAgo(h),
        });
      if (i === 0) {
        say(me.id, 'Hi! Your pup is adorable.', 20);
        say(u.id, 'Thank you! Yours too. Dog park this weekend?', 3);
      } else if (i === 1) {
        say(u.id, 'Hey! Saw you hike with your dog. Favorite trail?', 28);
        say(me.id, 'Ridgeline Loop, hands down.', 26);
      }
    });
  }

  addMessage(message: Message): void {
    this.messages.push(message);
    this.listeners.forEach((l) => l(message));
  }

  subscribe(listener: MessageListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  isBlocked(a: ID, b: ID): boolean {
    return this.blocks.some(
      (x) => (x.blockerId === a && x.blockedId === b) || (x.blockerId === b && x.blockedId === a),
    );
  }

  findMatch(a: ID, b: ID): Match | undefined {
    return this.matches.find((m) => m.userIds.includes(a) && m.userIds.includes(b));
  }

  /** A user together with their pets. */
  profileOf(id: ID): Profile {
    return {
      user: this.requireUser(id),
      pets: [...this.pets.values()].filter((p) => p.ownerId === id),
    };
  }

  requireUser(id: ID): User {
    const user = this.users.get(id);
    if (!user) throw new Error(`User not found: ${id}`);
    return user;
  }
}
