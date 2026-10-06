import { buildSeed, SEED_VIEWER_ID } from '@/mocks/seed';
import { changedFields, draftFromUser, draftProblem, profileUpdateFor } from '../profileDraft';

const user = () => buildSeed(new Date()).users.find((u) => u.id === SEED_VIEWER_ID)!;

describe('changedFields', () => {
  it('is empty for an untouched draft', () => {
    const u = user();
    expect(changedFields(u, draftFromUser(u))).toEqual({});
  });

  it('returns only what changed, trimmed', () => {
    const u = user();
    const draft = { ...draftFromUser(u), firstName: '  Maya  ', relationshipGoals: [] as never[] };
    expect(changedFields(u, draft)).toEqual({
      firstName: 'Maya',
      relationshipGoals: [],
    });
  });

  it('treats blank job/hometown the same as missing', () => {
    const u = { ...user(), basics: { job: undefined, hometown: undefined } };
    const draft = { ...draftFromUser(u), basics: { job: '   ', hometown: '' } };
    expect(changedFields(u, draft)).toEqual({});
  });

  it('catches gender and interested-in changes', () => {
    const u = user();
    const base = draftFromUser(u);
    const other = u.gender === 'woman' ? 'man' : 'woman';
    expect(
      Object.keys(changedFields(u, { ...base, gender: other, interestedIn: ['nonbinary'] })).sort(),
    ).toEqual(['gender', 'interestedIn']);
  });

  it('catches edits to photos, prompts and location', () => {
    const u = user();
    const base = draftFromUser(u);
    const changed = changedFields(u, {
      ...base,
      photos: [...base.photos].reverse(),
      promptAnswers: base.promptAnswers.slice(1),
      location: { ...base.location, city: 'Oakland' },
    });
    expect(Object.keys(changed).sort()).toEqual(['location', 'photos', 'promptAnswers']);
  });
});

describe('draftProblem', () => {
  it('needs a name and a valid birthday', () => {
    const base = draftFromUser(user());
    expect(draftProblem(base, true)).toBeNull();
    expect(draftProblem({ ...base, firstName: '  ' }, true)).toMatch(/name/);
    expect(draftProblem(base, false)).toMatch(/birthday/);
    expect(draftProblem({ ...base, interestedIn: [] }, true)).toMatch(/interested/);
  });
});

describe('profileUpdateFor', () => {
  it('passes changes through untouched', () => {
    expect(profileUpdateFor(user(), { firstName: 'Mel' })).toEqual({ firstName: 'Mel' });
  });
  it('keeps the genders preference in step with interested-in', () => {
    const u = user();
    const result = profileUpdateFor(u, { interestedIn: ['nonbinary'] });
    expect(result.interestedIn).toEqual(['nonbinary']);
    expect(result.preferences).toEqual({ ...u.preferences, genders: ['nonbinary'] });
  });
});
