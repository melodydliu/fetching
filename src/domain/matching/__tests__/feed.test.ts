import { buildSeed } from '@/mocks/seed';
import { applyHardFilters } from '../filters';
import { buildFeed } from '../feed';
import { makeCandidate, makeViewer, noExclusions, NOW } from '../testing';
import type { Profile } from '../../types';

const ctx = { now: NOW, excludedIds: noExclusions, incomingLikes: new Map() };

describe('buildFeed', () => {
  it('returns nothing for an empty pool', () => {
    expect(buildFeed(makeViewer(), [], ctx)).toEqual([]);
  });

  it('drops filtered people and keeps the rest', () => {
    const ok = makeCandidate();
    const wrongGender = makeCandidate({ interestedIn: ['man'] });
    const paused = makeCandidate({ paused: true });
    const feed = buildFeed(makeViewer(), [ok, wrongGender, paused], ctx);
    expect(feed.map((f) => f.profile.user.id)).toEqual([ok.user.id]);
  });

  describe('with server-provided distances (real backend, private coordinates)', () => {
    it('only considers people the server measured, and uses its distance', () => {
      const near = makeCandidate();
      const farAway = makeCandidate();
      const unmeasured = makeCandidate();
      const feed = buildFeed(makeViewer(), [near, farAway, unmeasured], {
        ...ctx,
        distances: new Map([
          [near.user.id, 3],
          [farAway.user.id, 20],
        ]),
      });
      expect(feed.map((f) => [f.profile.user.id, f.distanceMiles])).toEqual(
        expect.arrayContaining([
          [near.user.id, 3],
          [farAway.user.id, 20],
        ]),
      );
      expect(feed.map((f) => f.profile.user.id)).not.toContain(unmeasured.user.id);
    });

    it('still applies the distance rule using the server distance, and ranks closer higher', () => {
      const viewer = makeViewer();
      const close = makeCandidate();
      const edge = makeCandidate();
      const tooFar = makeCandidate();
      const max = viewer.user.preferences.maxDistanceMiles;
      const feed = buildFeed(viewer, [close, edge, tooFar], {
        ...ctx,
        distances: new Map([
          [close.user.id, 1],
          [edge.user.id, max - 1],
          [tooFar.user.id, max + 5],
        ]),
      });
      const ids = feed.map((f) => f.profile.user.id);
      expect(ids).not.toContain(tooFar.user.id);
      expect(ids.indexOf(close.user.id)).toBeLessThan(ids.indexOf(edge.user.id));
    });
  });

  it('never includes excluded people', () => {
    const a = makeCandidate();
    const b = makeCandidate();
    const feed = buildFeed(makeViewer(), [a, b], { ...ctx, excludedIds: new Set([a.user.id]) });
    expect(feed.map((f) => f.profile.user.id)).toEqual([b.user.id]);
  });

  it('sorts best first and breaks ties by id, so the order is stable', () => {
    const viewer = makeViewer({}, [{ energy: 'high' }]);
    const best = makeCandidate({ id: 'z-best' }, [{ energy: 'high' }]);
    const worse = makeCandidate({ id: 'a-worse' }, [{ energy: 'low' }]);
    const tieA = makeCandidate({ id: 'tie-a' }, [{ energy: 'high' }]);
    const feed = buildFeed(viewer, [worse, tieA, best], ctx);
    const ids = feed.map((f) => f.profile.user.id);
    expect(ids.indexOf('worse'.padStart(0))).toBe(-1);
    expect(ids[ids.length - 1]).toBe('a-worse');
    expect(ids.slice(0, 2)).toEqual(['tie-a', 'z-best']);
    expect(buildFeed(viewer, [best, tieA, worse], ctx).map((f) => f.profile.user.id)).toEqual(ids);
  });

  it('surfaces people who already liked the viewer, and exposes it for the UI', () => {
    const viewer = makeViewer({}, [{ energy: 'high' }]);
    const strong = makeCandidate({ id: 'strong' }, [{ energy: 'high' }]);
    const admirer = makeCandidate({ id: 'admirer' }, [{ energy: 'low' }]);
    const feed = buildFeed(viewer, [strong, admirer], {
      ...ctx,
      incomingLikes: new Map([['admirer', { isTreat: true }]]),
    });
    expect(feed[0]!.profile.user.id).toBe('admirer');
    expect(feed[0]!.likedYou).toEqual({ isTreat: true });
    expect(feed[1]!.likedYou).toBeNull();
  });

  it('a like never overrides a hard filter', () => {
    const blocked = makeCandidate({ id: 'blocked-admirer' });
    const feed = buildFeed(makeViewer(), [blocked], {
      ...ctx,
      excludedIds: new Set(['blocked-admirer']),
      incomingLikes: new Map([['blocked-admirer', { isTreat: true }]]),
    });
    expect(feed).toEqual([]);
  });

  it('attaches distance and compatibility with reasons', () => {
    const [first] = buildFeed(
      makeViewer({}, [{ energy: 'high' }]),
      [makeCandidate({}, [{ energy: 'high' }])],
      ctx,
    );
    expect(first!.distanceMiles).toBeCloseTo(0, 5);
    expect(first!.compatibility.informative).toBe(true);
    expect(first!.compatibility.reasons.length).toBeGreaterThan(0);
  });
});

describe('buildFeed on the seeded world', () => {
  const { users, pets } = buildSeed();
  const profiles: Profile[] = users.map((user) => ({
    user,
    pets: pets.filter((p) => p.ownerId === user.id),
  }));
  const seedNow = new Date('2026-10-01T12:00:00Z');
  const seedCtx = { now: seedNow, excludedIds: noExclusions, incomingLikes: new Map() };

  it('gives the demo user a healthy feed (enough to hit the daily like limit)', () => {
    const me = profiles.find((p) => p.user.id === 'u-me')!;
    expect(buildFeed(me, profiles, seedCtx).length).toBeGreaterThanOrEqual(10);
  });

  it('every feed entry passes the hard filters, never contains the viewer, and is sorted', () => {
    for (const viewer of profiles) {
      const feed = buildFeed(viewer, profiles, seedCtx);
      expect(feed.some((f) => f.profile.user.id === viewer.user.id)).toBe(false);
      feed.forEach((f) =>
        expect(
          applyHardFilters(viewer, f.profile, {
            now: seedNow,
            distanceMiles: f.distanceMiles,
            excludedIds: noExclusions,
          }).pass,
        ).toBe(true),
      );
      const ranks = feed.map((f) => f.rank);
      expect(ranks).toEqual([...ranks].sort((a, b) => b - a));
    }
  });

  it('is mutual: if A sees B, B sees A', () => {
    const pairs = new Set<string>();
    for (const viewer of profiles) {
      for (const f of buildFeed(viewer, profiles, seedCtx))
        pairs.add(`${viewer.user.id}>${f.profile.user.id}`);
    }
    for (const key of pairs) {
      const [a, b] = key.split('>');
      expect(pairs.has(`${b}>${a}`)).toBe(true);
    }
  });
});
