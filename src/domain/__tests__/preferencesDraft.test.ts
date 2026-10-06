import { buildSeed, SEED_VIEWER_ID } from '@/mocks/seed';
import {
  draftFromUser,
  hasSelection,
  isDirty,
  normalizeDraft,
  resetDraft,
  stepAge,
} from '../preferencesDraft';

const user = () => buildSeed(new Date()).users.find((u) => u.id === SEED_VIEWER_ID)!;

describe('stepAge', () => {
  it('moves one end, never crossing the other or leaving 18-99', () => {
    expect(stepAge({ min: 25, max: 35 }, 'min', 1)).toEqual({ min: 26, max: 35 });
    expect(stepAge({ min: 35, max: 35 }, 'min', 1)).toEqual({ min: 35, max: 35 });
    expect(stepAge({ min: 18, max: 30 }, 'min', -1)).toEqual({ min: 18, max: 30 });
    expect(stepAge({ min: 25, max: 25 }, 'max', -1)).toEqual({ min: 25, max: 25 });
    expect(stepAge({ min: 25, max: 99 }, 'max', 1)).toEqual({ min: 25, max: 99 });
    expect(stepAge({ min: 25, max: 30 }, 'max', 5)).toEqual({ min: 25, max: 35 });
  });
});

describe('hasSelection / normalizeDraft', () => {
  it('a dealbreaker with nothing selected is switched off', () => {
    const u = user();
    const draft = draftFromUser(u);
    const result = normalizeDraft({
      ...draft,
      preferences: { ...draft.preferences, petSpecies: [], show: 'both' },
      dealbreakers: { ...draft.dealbreakers, petSpecies: true, show: true },
    });
    expect(result.dealbreakers.petSpecies).toBe(false);
    expect(result.dealbreakers.show).toBe(false);
  });

  it('keeps a dealbreaker that has a selection', () => {
    const draft = draftFromUser(user());
    const result = normalizeDraft({
      ...draft,
      preferences: { ...draft.preferences, petSpecies: ['dog'], show: 'both' },
      dealbreakers: { ...draft.dealbreakers, petSpecies: true },
    });
    expect(result.dealbreakers.petSpecies).toBe(true);
    expect(hasSelection(result.preferences, 'petSpecies', [])).toBe(true);
    expect(hasSelection(result.preferences, 'show', [])).toBe(false);
    expect(hasSelection(result.preferences, 'allergies', ['cat'])).toBe(true);
  });
});

describe('isDirty / resetDraft', () => {
  it('an untouched draft is clean; a change is dirty', () => {
    const u = user();
    const draft = draftFromUser(u);
    expect(isDirty(u, draft)).toBe(false);
    expect(
      isDirty(u, { ...draft, preferences: { ...draft.preferences, maxDistanceMiles: 7 } }),
    ).toBe(true);
  });

  it('reset restores defaults but keeps my own facts', () => {
    const u = {
      ...user(),
      allergies: ['cat' as const],
      dealbreakers: { ...user().dealbreakers, petNotGoodWith: ['dog' as const], petSpecies: true },
    };
    const reset = resetDraft(u);
    expect(reset.preferences.maxDistanceMiles).toBe(25);
    expect(reset.preferences.genders).toEqual(u.interestedIn);
    expect(reset.dealbreakers.petSpecies).toBe(false);
    expect(reset.dealbreakers.petNotGoodWith).toEqual(['dog']);
    expect(reset.allergies).toEqual(['cat']);
  });
});
