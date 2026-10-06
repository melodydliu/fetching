/**
 * Gives a real tester account a believable starting state, like the mock does: a few incoming
 * likes (the first is a Treat), and a few existing matches with some conversation. Only people
 * who would genuinely appear in the tester's Discover are used (same hard filters + ranking).
 * Pure, like seedPlan.ts.
 */
import { buildFeed } from '@/domain/matching';
import type { Pet, Profile } from '@/domain/types';
import type { Row } from './seedPlan';

const COMMENTS = [
  'This made me laugh out loud.',
  undefined,
  'We would get along.',
  undefined,
  undefined,
];

export interface InteractionPlan {
  likes: Row[];
  matches: Row[];
  messages: Row[];
  /** Who got what, for the summary printout. */
  summary: { likedBy: string[]; matchedWith: string[] };
}

export function planInteractions(
  viewer: Profile,
  /** Seeded people with their (real) ids and coordinates. */
  pool: Profile[],
  now: Date,
  newId: () => string,
): InteractionPlan {
  const hoursAgo = (h: number) => new Date(now.getTime() - h * 3600_000).toISOString();
  const feed = buildFeed(viewer, pool, {
    now,
    excludedIds: new Set(),
    incomingLikes: new Map(),
  });
  const eligible = feed.map((f) => f.profile);

  const likers = eligible.slice(0, 5);
  const matched = eligible.slice(5, 8);
  const { user: me } = viewer;
  const pets: Pet[] = viewer.pets;

  const likes = likers.map((p, i): Row => {
    const prompt = me.promptAnswers[i % Math.max(me.promptAnswers.length, 1)];
    const pet = pets[0];
    const photo = me.photos[i % Math.max(me.photos.length, 1)];
    const target =
      i % 2 === 0 && prompt
        ? { target_type: 'prompt', target_id: prompt.id }
        : i === 3 && pet
          ? { target_type: 'pet', target_id: pet.id }
          : { target_type: 'photo', target_id: photo?.id ?? prompt?.id };
    return {
      id: newId(),
      from_user_id: p.user.id,
      to_user_id: me.id,
      ...target,
      comment: COMMENTS[i % COMMENTS.length] ?? null,
      is_treat: i === 0,
      created_at: hoursAgo(2 + i * 5),
    };
  });

  const matches: Row[] = [];
  const messages: Row[] = [];
  matched.forEach((p, i) => {
    const matchId = newId();
    const [a, b] = me.id < p.user.id ? [me.id, p.user.id] : [p.user.id, me.id];
    matches.push({ id: matchId, user_a: a, user_b: b, created_at: hoursAgo(30 - i * 8) });
    const say = (sender: string, body: string, h: number) =>
      messages.push({
        id: newId(),
        match_id: matchId,
        sender_id: sender,
        kind: 'text',
        body,
        created_at: hoursAgo(h),
      });
    // One waiting on the tester, one waiting on them, one brand new (no messages).
    if (i === 0) {
      say(me.id, 'Hi! Your pup is adorable.', 20);
      say(p.user.id, 'Thank you! Yours too. Dog park this weekend?', 3);
    } else if (i === 1) {
      say(p.user.id, 'Hey! Saw you hike with your dog. Favorite trail?', 28);
      say(me.id, 'Ridgeline Loop, hands down.', 26);
    }
  });

  return {
    likes,
    matches,
    messages,
    summary: {
      likedBy: likers.map((p) => p.user.firstName),
      matchedWith: matched.map((p) => p.user.firstName),
    },
  };
}
