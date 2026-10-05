import { applyHardFilters, mutualOrientationFit } from '../filters';
import { lover, makeCandidate, makeViewer, noExclusions, NOW } from '../testing';
import type { Profile } from '../../types';
import { dealbreakerViolations, softPreferenceScore } from '../preferences';

const run = (v: Profile, c: Profile, over: { distanceMiles?: number; excluded?: string[] } = {}) =>
  applyHardFilters(v, c, {
    now: NOW,
    distanceMiles: over.distanceMiles ?? 3,
    excludedIds: over.excluded ? new Set(over.excluded) : noExclusions,
  });

const failureOf = (r: ReturnType<typeof run>) => (r.pass ? null : r.failure);

describe('applyHardFilters: basics', () => {
  it('passes an ordinary compatible pair', () => {
    expect(run(makeViewer(), makeCandidate()).pass).toBe(true);
  });

  it('rejects yourself', () => {
    const v = makeViewer();
    expect(failureOf(run(v, v))).toEqual({ reason: 'self' });
  });

  it('rejects excluded people (blocked, liked, passed, matched)', () => {
    const c = makeCandidate();
    expect(failureOf(run(makeViewer(), c, { excluded: [c.user.id] }))).toEqual({
      reason: 'excluded',
    });
  });

  it('rejects paused and not-yet-onboarded profiles', () => {
    expect(failureOf(run(makeViewer(), makeCandidate({ paused: true })))).toEqual({
      reason: 'paused',
    });
    expect(failureOf(run(makeViewer(), makeCandidate({ onboardingComplete: false })))).toEqual({
      reason: 'incomplete',
    });
  });
});

describe('orientation', () => {
  it('requires interest in BOTH directions', () => {
    const v = makeViewer();
    expect(failureOf(run(v, makeCandidate({ interestedIn: ['man'] })))).toEqual({
      reason: 'orientation',
    });
    expect(failureOf(run(makeViewer({ interestedIn: ['woman'] }), makeCandidate()))).toEqual({
      reason: 'orientation',
    });
  });

  it('supports same-gender and everyone', () => {
    const a = makeViewer({ gender: 'woman', interestedIn: ['woman'] });
    const b = makeCandidate({ gender: 'woman', interestedIn: ['woman', 'man'] });
    expect(mutualOrientationFit(a, b)).toBe(true);
    const nb = makeCandidate({ gender: 'nonbinary', interestedIn: ['man', 'woman', 'nonbinary'] });
    expect(
      mutualOrientationFit(makeViewer({ interestedIn: ['man', 'woman', 'nonbinary'] }), nb),
    ).toBe(true);
  });
});

describe('age (both ways, inclusive)', () => {
  const range = (min: number, max: number) => ({
    ageRange: { min, max },
    maxDistanceMiles: 25,
    genders: [],
    relationshipGoals: [],
    show: 'both' as const,
    petSpecies: [],
    petSizes: [],
    petEnergy: [],
  });

  it('rejects a candidate outside the viewer’s range', () => {
    expect(failureOf(run(makeViewer({ preferences: range(20, 29) }), makeCandidate()))).toEqual({
      reason: 'age',
    });
  });

  it('rejects when the viewer is outside the CANDIDATE’s range', () => {
    expect(failureOf(run(makeViewer(), makeCandidate({ preferences: range(35, 50) })))).toEqual({
      reason: 'age',
    });
  });

  it('includes both boundaries', () => {
    // Both are 30 on NOW.
    expect(
      run(makeViewer({ preferences: range(30, 30) }), makeCandidate({ preferences: range(30, 30) }))
        .pass,
    ).toBe(true);
  });
});

describe('distance (both ways)', () => {
  it('rejects beyond the viewer’s max', () => {
    expect(failureOf(run(makeViewer(), makeCandidate(), { distanceMiles: 25.1 }))).toEqual({
      reason: 'distance',
    });
  });

  it('rejects beyond the candidate’s max even if the viewer would travel', () => {
    const far = makeViewer({
      preferences: { ...makeViewer().user.preferences, maxDistanceMiles: 50 },
    });
    const homebody = makeCandidate({
      preferences: { ...makeCandidate().user.preferences, maxDistanceMiles: 10 },
    });
    expect(failureOf(run(far, homebody, { distanceMiles: 20 }))).toEqual({ reason: 'distance' });
    expect(run(far, homebody, { distanceMiles: 10 }).pass).toBe(true);
  });
});

describe('dealbreakers', () => {
  const prefs = (over: object) => ({ ...makeViewer().user.preferences, ...over });
  const flags = (over: object) => ({ ...makeViewer().user.dealbreakers, ...over });

  it('a preference is soft until it is toggled into a dealbreaker', () => {
    const soft = makeViewer({ preferences: prefs({ show: 'animal_lovers' }) });
    expect(run(soft, makeCandidate()).pass).toBe(true);
    const hard = makeViewer({
      preferences: prefs({ show: 'animal_lovers' }),
      dealbreakers: flags({ show: true }),
    });
    expect(failureOf(run(hard, makeCandidate()))).toMatchObject({
      reason: 'dealbreaker',
      by: 'viewer',
      rules: ['show'],
    });
  });

  it('applies dealbreakers set by the CANDIDATE too', () => {
    const picky = makeCandidate({
      preferences: prefs({ show: 'animal_lovers' }),
      dealbreakers: flags({ show: true }),
    });
    expect(failureOf(run(makeViewer(), picky))).toMatchObject({
      reason: 'dealbreaker',
      by: 'candidate',
    });
  });

  it('conflicting dealbreakers: each side demanding the other kind means nobody sees anybody', () => {
    const wantsOwners = {
      preferences: prefs({ show: 'pet_owners' }),
      dealbreakers: flags({ show: true }),
    };
    const wantsLovers = {
      preferences: prefs({ show: 'animal_lovers' }),
      dealbreakers: flags({ show: true }),
    };
    const a = makeViewer(wantsLovers); // owner who only wants animal lovers
    const b = makeCandidate(wantsOwners); // owner who only wants pet owners
    expect(run(a, b).pass).toBe(false);
    expect(run(b, a).pass).toBe(false);
  });

  it('conflicting dealbreakers are symmetric: either perspective rejects', () => {
    const l = lover({
      gender: 'man',
      interestedIn: ['woman'],
      preferences: prefs({ show: 'animal_lovers' }),
      dealbreakers: flags({ show: true }),
    });
    const owner = makeViewer({
      preferences: prefs({ show: 'pet_owners' }),
      dealbreakers: flags({ show: true }),
    });
    expect(run(owner, l).pass).toBe(false);
    expect(run(l, owner).pass).toBe(false);
  });

  it('a pet-species dealbreaker excludes animal lovers (they have no pets)', () => {
    const v = makeViewer({
      preferences: prefs({ petSpecies: ['dog'] }),
      dealbreakers: flags({ petSpecies: true }),
    });
    expect(failureOf(run(v, lover({ gender: 'man', interestedIn: ['woman'] })))).toMatchObject({
      rules: ['petSpecies'],
    });
    expect(run(v, makeCandidate({}, [{ species: 'dog' }])).pass).toBe(true);
    expect(run(v, makeCandidate({}, [{ species: 'cat' }])).pass).toBe(false);
  });

  it('multi-pet households pass when ANY pet fits', () => {
    const v = makeViewer({
      preferences: prefs({ petSpecies: ['cat'] }),
      dealbreakers: flags({ petSpecies: true }),
    });
    expect(run(v, makeCandidate({}, [{ species: 'dog' }, { species: 'cat' }])).pass).toBe(true);
  });

  it('size dealbreaker only judges dogs with a known size; others are neutral', () => {
    const v = makeViewer({
      preferences: prefs({ petSizes: ['small'] }),
      dealbreakers: flags({ petSizes: true }),
    });
    expect(run(v, makeCandidate({}, [{ species: 'dog', size: 'large' }])).pass).toBe(false);
    expect(run(v, makeCandidate({}, [{ species: 'dog', size: 'small' }])).pass).toBe(true);
    expect(run(v, makeCandidate({}, [{ species: 'cat', size: undefined }])).pass).toBe(true); // no dog
    expect(run(v, makeCandidate({}, [{ species: 'dog', size: undefined }])).pass).toBe(true); // unknown size
  });

  it('energy dealbreaker needs at least one matching pet; pet-less users are neutral', () => {
    const v = makeViewer({
      preferences: prefs({ petEnergy: ['high'] }),
      dealbreakers: flags({ petEnergy: true }),
    });
    expect(run(v, makeCandidate({}, [{ energy: 'low' }])).pass).toBe(false);
    expect(run(v, makeCandidate({}, [{ energy: 'low' }, { energy: 'high' }])).pass).toBe(true);
    expect(run(v, lover({ gender: 'man', interestedIn: ['woman'] })).pass).toBe(true);
  });

  it('a skipped relationship goal is neutral, not a violation', () => {
    const v = makeViewer({
      preferences: prefs({ relationshipGoals: ['long_term'] }),
      dealbreakers: flags({ relationshipGoals: true }),
    });
    expect(run(v, makeCandidate({ relationshipGoals: [] })).pass).toBe(true);
    expect(run(v, makeCandidate({ relationshipGoals: ['something_casual'] })).pass).toBe(false);
    expect(run(v, makeCandidate({ relationshipGoals: ['long_term'] })).pass).toBe(true);
    // Any one of several goals is enough.
    expect(
      run(v, makeCandidate({ relationshipGoals: ['something_casual', 'long_term'] })).pass,
    ).toBe(true);
  });

  it('"my pet isn’t good with cats" excludes anyone with a cat, in any household', () => {
    const v = makeViewer({ dealbreakers: flags({ petNotGoodWith: ['cat'] }) });
    expect(
      failureOf(run(v, makeCandidate({}, [{ species: 'dog' }, { species: 'cat' }]))),
    ).toMatchObject({ rules: ['petNotGoodWith'] });
    expect(run(v, makeCandidate({}, [{ species: 'dog' }])).pass).toBe(true);
    expect(run(v, lover({ gender: 'man', interestedIn: ['woman'] })).pass).toBe(true);
  });

  it('an allergy is a hard filter only when flagged', () => {
    const allergic = { allergies: ['cat' as const] };
    const cat = makeCandidate({}, [{ species: 'cat' }]);
    expect(run(makeViewer(allergic), cat).pass).toBe(true); // handled by the score instead
    expect(
      failureOf(run(makeViewer({ ...allergic, dealbreakers: flags({ allergies: true }) }), cat)),
    ).toMatchObject({
      rules: ['allergies'],
    });
  });

  it('reports every rule that fired', () => {
    const v = makeViewer({
      preferences: prefs({ petSpecies: ['cat'], petEnergy: ['low'] }),
      dealbreakers: flags({ petSpecies: true, petEnergy: true }),
    });
    expect(
      dealbreakerViolations(v, makeCandidate({}, [{ species: 'dog', energy: 'high' }])).sort(),
    ).toEqual(['petEnergy', 'petSpecies']);
  });
});

describe('softPreferenceScore', () => {
  const prefs = (over: object) => ({ ...makeViewer().user.preferences, ...over });

  it('is null when no preference is set', () => {
    expect(softPreferenceScore(makeViewer(), makeCandidate())).toBeNull();
  });

  it('is the share of set, judgeable preferences that are met', () => {
    const v = makeViewer({ preferences: prefs({ petSpecies: ['dog'], petEnergy: ['high'] }) });
    expect(softPreferenceScore(v, makeCandidate({}, [{ species: 'dog', energy: 'low' }]))).toBe(50);
    expect(softPreferenceScore(v, makeCandidate({}, [{ species: 'dog', energy: 'high' }]))).toBe(
      100,
    );
  });

  it('ignores unknown values instead of counting them as misses', () => {
    const v = makeViewer({ preferences: prefs({ relationshipGoals: ['long_term'] }) });
    expect(softPreferenceScore(v, makeCandidate({ relationshipGoals: [] }))).toBeNull();
  });
});
