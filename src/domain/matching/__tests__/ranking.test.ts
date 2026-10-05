import { MATCHING_CONFIG } from '../config';
import { petCompatibility } from '../petCompatibility';
import { distanceScore, goalsScore, rankCandidate, recencyScore } from '../ranking';
import { makeCandidate, makeViewer, NOW } from '../testing';

const rank = (
  viewer = makeViewer(),
  candidate = makeCandidate(),
  over: { distanceMiles?: number; likedYou?: { isTreat: boolean } | null } = {},
) =>
  rankCandidate(
    viewer,
    candidate,
    { now: NOW, distanceMiles: over.distanceMiles ?? 5, likedYou: over.likedYou ?? null },
    petCompatibility(viewer, candidate),
  );

describe('config sanity', () => {
  it('rank weights sum to 1', () => {
    const sum = Object.values(MATCHING_CONFIG.rank.weights).reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1, 10);
  });
});

describe('distanceScore', () => {
  it('is 100 at zero, 0 at the max, linear between, and clamped', () => {
    expect(distanceScore(0, 25)).toBe(100);
    expect(distanceScore(25, 25)).toBe(0);
    expect(distanceScore(12.5, 25)).toBe(50);
    expect(distanceScore(40, 25)).toBe(0);
    expect(distanceScore(5, 0)).toBe(0);
  });
});

describe('recencyScore', () => {
  const ago = (hours: number) => new Date(NOW.getTime() - hours * 3_600_000).toISOString();
  it('full marks when recent, zero when stale, fading in between', () => {
    expect(recencyScore(ago(1), NOW)).toBe(100);
    expect(recencyScore(ago(24), NOW)).toBe(100);
    expect(recencyScore(ago(14 * 24), NOW)).toBe(0);
    expect(recencyScore(ago(30 * 24), NOW)).toBe(0);
    const mid = recencyScore(ago(24 + (14 * 24 - 24) / 2), NOW);
    expect(mid).toBeCloseTo(50, 5);
  });

  it('treats a future or invalid timestamp safely', () => {
    expect(recencyScore(ago(-5), NOW)).toBe(100);
    expect(recencyScore('not a date', NOW)).toBe(MATCHING_CONFIG.rank.neutral);
  });
});

describe('goalsScore', () => {
  it('rewards the same goal, penalizes different, and is neutral when unknown', () => {
    const v = makeViewer({ relationshipGoal: 'long_term' });
    expect(goalsScore(v, makeCandidate({ relationshipGoal: 'long_term' }))).toBe(100);
    expect(goalsScore(v, makeCandidate({ relationshipGoal: 'something_casual' }))).toBe(20);
    expect(goalsScore(v, makeCandidate({ relationshipGoal: undefined }))).toBe(50);
    expect(
      goalsScore(
        makeViewer({ relationshipGoal: undefined }),
        makeCandidate({ relationshipGoal: 'long_term' }),
      ),
    ).toBe(50);
  });

  it('counts a goal the viewer listed in preferences as shared', () => {
    const v = makeViewer({
      relationshipGoal: 'long_term',
      preferences: { ...makeViewer().user.preferences, relationshipGoals: ['friends_first'] },
    });
    expect(goalsScore(v, makeCandidate({ relationshipGoal: 'friends_first' }))).toBe(100);
  });
});

describe('rankCandidate', () => {
  it('ranks closer candidates higher, all else equal', () => {
    expect(rank(undefined, undefined, { distanceMiles: 2 }).rank).toBeGreaterThan(
      rank(undefined, undefined, { distanceMiles: 20 }).rank,
    );
  });

  it('ranks more recently active candidates higher', () => {
    const fresh = makeCandidate({ lastActiveAt: '2026-10-05T11:00:00Z' });
    const stale = makeCandidate({ lastActiveAt: '2026-09-01T11:00:00Z' });
    expect(rank(undefined, fresh).rank).toBeGreaterThan(rank(undefined, stale).rank);
  });

  it('ranks a better pet match higher', () => {
    const viewer = makeViewer({}, [{ energy: 'high' }]);
    const twin = makeCandidate({}, [{ energy: 'high' }]);
    const opposite = makeCandidate({}, [{ energy: 'low' }]);
    expect(rank(viewer, twin).rank).toBeGreaterThan(rank(viewer, opposite).rank);
  });

  it('boosts people who already liked the viewer, and a Treat more than a like', () => {
    const none = rank().rank;
    const liked = rank(undefined, undefined, { likedYou: { isTreat: false } }).rank;
    const treat = rank(undefined, undefined, { likedYou: { isTreat: true } }).rank;
    expect(liked - none).toBeCloseTo(MATCHING_CONFIG.rank.boosts.likedYou, 8);
    expect(treat - none).toBeCloseTo(MATCHING_CONFIG.rank.boosts.treat, 8);
    expect(treat).toBeGreaterThan(liked);
  });

  it('a like boost can lift a somewhat weaker profile above a stronger one (mutual interest surfaces sooner)', () => {
    const viewer = makeViewer({}, [{ energy: 'high' }]);
    const strong = makeCandidate({}, [{ energy: 'high' }]);
    const weaker = makeCandidate({}, [{ energy: 'medium' }]);
    expect(rank(viewer, strong).rank).toBeGreaterThan(rank(viewer, weaker).rank);
    expect(rank(viewer, weaker, { likedYou: { isTreat: false } }).rank).toBeGreaterThan(
      rank(viewer, strong).rank,
    );
  });

  it('but a boost does not bury everything: a far weaker profile still ranks below', () => {
    const viewer = makeViewer({}, [{ energy: 'high' }]);
    const strong = makeCandidate({}, [{ energy: 'high' }]);
    const poor = makeCandidate({ lastActiveAt: '2026-09-10T00:00:00Z' }, [{ energy: 'low' }]);
    expect(rank(viewer, poor, { likedYou: { isTreat: true } }).rank).toBeLessThan(
      rank(viewer, strong).rank,
    );
  });

  it('uses neutral values rather than zero for missing signals', () => {
    const { parts } = rank(
      makeViewer({ relationshipGoal: undefined }),
      makeCandidate({ relationshipGoal: undefined }),
    );
    expect(parts.goals).toBe(MATCHING_CONFIG.rank.neutral);
    expect(parts.preferences).toBe(MATCHING_CONFIG.rank.neutral);
  });
});
