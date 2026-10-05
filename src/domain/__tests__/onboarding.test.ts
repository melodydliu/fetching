import {
  buildSteps,
  firstIncompleteStep,
  nextStep,
  previousStep,
  profileCompleteness,
  stepProgress,
  validateBirthdate,
} from '../onboarding';
import { moveItem } from '../list';
import { buildSeed } from '@/mocks/seed';
import type { Profile } from '../types';

const NOW = new Date('2026-10-05T12:00:00Z');

describe('buildSteps', () => {
  it('gives owners pet steps and lovers animal-lover steps, both ending in prompts + done', () => {
    const owner = buildSteps('pet_owner');
    const lover = buildSteps('animal_lover');
    expect(owner).toContain('pet-photos');
    expect(owner).not.toContain('lover-species');
    expect(lover).toContain('lover-species');
    expect(lover).not.toContain('pet-basics');
    expect(owner.slice(-2)).toEqual(['prompts', 'done']);
    expect(lover.slice(-2)).toEqual(['prompts', 'done']);
  });

  it('follows the brief order up to the pet question', () => {
    expect(buildSteps('pet_owner').slice(0, 8)).toEqual([
      'name',
      'birthday',
      'gender',
      'interested-in',
      'location',
      'goal',
      'photos',
      'has-pet',
    ]);
  });
});

describe('navigation', () => {
  it('moves forward and back within a path', () => {
    expect(nextStep('name', 'pet_owner')).toBe('birthday');
    expect(previousStep('birthday', 'pet_owner')).toBe('name');
    expect(previousStep('name', 'pet_owner')).toBeNull();
  });

  it('branches after has-pet depending on kind', () => {
    expect(nextStep('has-pet', 'pet_owner')).toBe('pet-basics');
    expect(nextStep('has-pet', 'animal_lover')).toBe('lover-species');
    expect(nextStep('lover-open', 'animal_lover')).toBe('prompts');
  });

  it('never runs past the final step', () => {
    expect(nextStep('done', 'pet_owner')).toBe('done');
  });

  it('reports progress from 0 to 1', () => {
    expect(stepProgress('name', 'pet_owner')).toBe(0);
    expect(stepProgress('done', 'pet_owner')).toBe(1);
  });
});

describe('firstIncompleteStep', () => {
  it('starts at the beginning for a fresh account', () => {
    expect(firstIncompleteStep([], 'pet_owner')).toBe('name');
  });

  it('resumes at the first step not done, including skipped ones', () => {
    expect(firstIncompleteStep(['name', 'birthday', 'gender'], 'pet_owner')).toBe('interested-in');
    // A skipped step is recorded as done, so it is not asked again.
    expect(
      firstIncompleteStep(['name', 'birthday', 'gender', 'interested-in', 'location'], 'pet_owner'),
    ).toBe('goal');
  });

  it('lands on done when everything else is finished', () => {
    const all = buildSteps('animal_lover').filter((s) => s !== 'done');
    expect(firstIncompleteStep(all, 'animal_lover')).toBe('done');
  });
});

describe('validateBirthdate', () => {
  it('accepts a valid adult birthday and returns ISO + age', () => {
    expect(validateBirthdate('3', '14', '1996', NOW)).toEqual({
      ok: true,
      birthdate: '1996-03-14',
      age: 30,
    });
  });

  it('is incomplete until all fields are filled', () => {
    expect(validateBirthdate('', '14', '1996', NOW)).toEqual({ ok: false, reason: 'incomplete' });
    expect(validateBirthdate('3', '14', '19', NOW)).toEqual({ ok: false, reason: 'incomplete' });
  });

  it('rejects impossible dates instead of rolling them over', () => {
    expect(validateBirthdate('2', '31', '1996', NOW)).toEqual({ ok: false, reason: 'invalid' });
    expect(validateBirthdate('13', '1', '1996', NOW)).toEqual({ ok: false, reason: 'invalid' });
    expect(validateBirthdate('1', '1', 'abcd', NOW)).toEqual({ ok: false, reason: 'invalid' });
  });

  it('accepts Feb 29 only in leap years', () => {
    expect(validateBirthdate('2', '29', '1996', NOW).ok).toBe(true);
    expect(validateBirthdate('2', '29', '1997', NOW)).toEqual({ ok: false, reason: 'invalid' });
  });

  it('enforces 18+, to the day', () => {
    expect(validateBirthdate('10', '6', '2008', NOW)).toEqual({ ok: false, reason: 'too_young' });
    expect(validateBirthdate('10', '5', '2008', NOW).ok).toBe(true);
  });

  it('rejects future dates and absurd ages', () => {
    expect(validateBirthdate('1', '1', '2030', NOW)).toEqual({ ok: false, reason: 'invalid' });
    expect(validateBirthdate('1', '1', '1900', NOW)).toEqual({ ok: false, reason: 'too_old' });
  });
});

describe('profileCompleteness', () => {
  const { users, pets } = buildSeed();
  const owner = users.find((u) => u.kind === 'pet_owner')!;
  const lover = users.find((u) => u.kind === 'animal_lover')!;
  const profileOf = (u: typeof owner): Profile => ({
    user: u,
    pets: pets.filter((p) => p.ownerId === u.id),
  });

  it('scores a full owner profile high and lists nothing critical missing', () => {
    const { items, score } = profileCompleteness(profileOf(owner));
    expect(items.find((i) => i.key === 'pets')?.done).toBe(true);
    expect(score).toBeGreaterThan(0.7);
  });

  it('uses the lover checklist for animal lovers', () => {
    const { items } = profileCompleteness(profileOf(lover));
    expect(items.some((i) => i.key === 'lover')).toBe(true);
    expect(items.some((i) => i.key === 'pets')).toBe(false);
  });

  it('flags an empty profile as incomplete', () => {
    const empty: Profile = {
      user: { ...owner, photos: [], promptAnswers: [], relationshipGoal: undefined, basics: {} },
      pets: [],
    };
    const { score, items } = profileCompleteness(empty);
    expect(score).toBe(0);
    expect(items.every((i) => !i.done)).toBe(true);
  });

  it('requires 3+ pet photos for owners', () => {
    const pet = pets.find((p) => p.ownerId === owner.id)!;
    const thin: Profile = { user: owner, pets: [{ ...pet, photos: pet.photos.slice(0, 2) }] };
    expect(profileCompleteness(thin).items.find((i) => i.key === 'pets')?.done).toBe(false);
  });
});

describe('moveItem', () => {
  it('moves forward and backward without mutating the input', () => {
    const input = ['a', 'b', 'c', 'd'];
    expect(moveItem(input, 0, 2)).toEqual(['b', 'c', 'a', 'd']);
    expect(moveItem(input, 3, 1)).toEqual(['a', 'd', 'b', 'c']);
    expect(input).toEqual(['a', 'b', 'c', 'd']);
  });

  it('clamps out-of-range targets and ignores bad sources', () => {
    expect(moveItem(['a', 'b', 'c'], 0, 99)).toEqual(['b', 'c', 'a']);
    expect(moveItem(['a', 'b', 'c'], 2, -5)).toEqual(['c', 'a', 'b']);
    expect(moveItem(['a', 'b'], 5, 0)).toEqual(['a', 'b']);
    expect(moveItem([], 0, 0)).toEqual([]);
  });
});
