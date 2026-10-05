import { buildSeed } from '@/mocks/seed';
import { MATCHING_CONFIG } from '../config';
import { compatibilityLabel, petCompatibility } from '../petCompatibility';
import { lover, makeCandidate, makeViewer } from '../testing';
import type { Profile } from '../../types';

const texts = (c: ReturnType<typeof petCompatibility>) => c.reasons.map((r) => r.text);

describe('species cross-compatibility', () => {
  it('rewards a cat-friendly dog for a cat owner, and says so', () => {
    const viewer = makeViewer({}, [{ species: 'cat', size: undefined }]);
    const candidate = makeCandidate({}, [
      { species: 'dog', goodWith: { dogs: 'unsure', cats: 'yes', kids: 'unsure' } },
    ]);
    const c = petCompatibility(viewer, candidate);
    expect(texts(c)).toContain('Their dog is cat-friendly');
    expect(c.score).toBeGreaterThanOrEqual(75);
  });

  it('words same-species positives naturally (never "dog is dog-friendly")', () => {
    const goodWithDogs = { dogs: 'yes' as const, cats: 'unsure' as const, kids: 'unsure' as const };
    const c = petCompatibility(
      makeViewer({}, [{ species: 'dog', goodWith: goodWithDogs }]),
      makeCandidate({}, [{ species: 'dog', goodWith: goodWithDogs }]),
    );
    expect(texts(c)).toContain('Your dog gets along with other dogs');
    expect(texts(c)).toContain('Their dog gets along with other dogs');
    expect(texts(c).some((t) => t.includes('dog-friendly'))).toBe(false);
  });

  it('penalizes a dog that is not good with cats, with the caution listed first', () => {
    const viewer = makeViewer({}, [{ species: 'cat', size: undefined }]);
    const candidate = makeCandidate({}, [
      { species: 'dog', goodWith: { dogs: 'yes', cats: 'no', kids: 'yes' } },
    ]);
    const c = petCompatibility(viewer, candidate);
    expect(c.reasons[0]).toEqual({ text: "Their dog isn't good with cats", tone: 'caution' });
    expect(c.score).toBeLessThanOrEqual(MATCHING_CONFIG.pet.caps.species);
    expect(c.label === 'okay' || c.label === 'caution').toBe(true);
  });

  it('checks both directions', () => {
    const viewer = makeViewer({}, [
      { species: 'dog', goodWith: { dogs: 'yes', cats: 'no', kids: 'yes' } },
    ]);
    const candidate = makeCandidate({}, [{ species: 'cat', size: undefined }]);
    expect(texts(petCompatibility(viewer, candidate))).toContain("Your dog isn't good with cats");
  });

  it('treats "unsure" as neutral: not a penalty and not a reward', () => {
    const base = { species: 'dog' as const, size: 'medium' as const, energy: 'medium' as const };
    const unsure = petCompatibility(
      makeViewer({}, [{ ...base, goodWith: { dogs: 'unsure', cats: 'unsure', kids: 'unsure' } }]),
      makeCandidate({}, [
        { ...base, goodWith: { dogs: 'unsure', cats: 'unsure', kids: 'unsure' } },
      ]),
    );
    const no = petCompatibility(
      makeViewer({}, [{ ...base, goodWith: { dogs: 'no', cats: 'unsure', kids: 'unsure' } }]),
      makeCandidate({}, [
        { ...base, goodWith: { dogs: 'unsure', cats: 'unsure', kids: 'unsure' } },
      ]),
    );
    expect(unsure.reasons.some((r) => r.tone === 'caution')).toBe(false);
    expect(unsure.score).toBeGreaterThan(no.score);
  });

  it('has nothing to say about species it has no data for (rabbits, birds)', () => {
    const c = petCompatibility(
      makeViewer({}, [{ species: 'rabbit', size: undefined }]),
      makeCandidate({}, [{ species: 'bird', size: undefined }]),
    );
    expect(texts(c).some((t) => /friendly|good with/.test(t))).toBe(false);
  });

  it('multi-pet household: one conflicting pair drags the score down even if another pair is fine', () => {
    const viewer = makeViewer({}, [
      { species: 'dog', name: 'Rex', goodWith: { dogs: 'yes', cats: 'no', kids: 'yes' } },
      {
        species: 'cat',
        name: 'Miso',
        size: undefined,
        goodWith: { dogs: 'yes', cats: 'yes', kids: 'yes' },
      },
    ]);
    const candidate = makeCandidate({}, [
      { species: 'cat', size: undefined, goodWith: { dogs: 'yes', cats: 'yes', kids: 'yes' } },
    ]);
    const c = petCompatibility(viewer, candidate);
    expect(texts(c)).toContain("Your dog isn't good with cats");
    expect(texts(c).some((t) => t.includes('gets along with other cats'))).toBe(true);
    expect(c.score).toBeLessThanOrEqual(MATCHING_CONFIG.pet.caps.species);
  });
});

describe('energy and size', () => {
  it('names the shared energy level and species', () => {
    const c = petCompatibility(
      makeViewer({}, [{ energy: 'high' }]),
      makeCandidate({}, [{ energy: 'high' }]),
    );
    expect(texts(c)).toContain('Both have high-energy dogs');
  });

  it('says "pets" when the species differ', () => {
    const c = petCompatibility(
      makeViewer({}, [{ species: 'dog', energy: 'low' }]),
      makeCandidate({}, [{ species: 'cat', energy: 'low', size: undefined }]),
    );
    expect(texts(c)).toContain('Both have low-energy pets');
  });

  it('flags a low/high energy mismatch', () => {
    const c = petCompatibility(
      makeViewer({}, [{ energy: 'low' }]),
      makeCandidate({}, [{ energy: 'high' }]),
    );
    expect(c.reasons).toContainEqual({ text: 'Very different energy levels', tone: 'caution' });
  });

  it('multi-pet: uses the best-matching pair, so a calm pet does not hurt an energetic one’s match', () => {
    const viewer = makeViewer({}, [
      { energy: 'low', name: 'Nap' },
      { energy: 'high', name: 'Zoom' },
    ]);
    const c = petCompatibility(viewer, makeCandidate({}, [{ energy: 'high' }]));
    expect(texts(c)).toContain('Both have high-energy dogs');
    expect(texts(c)).not.toContain('Very different energy levels');
  });

  it('compares dog sizes: same is a plus, small vs giant is a caution', () => {
    const same = petCompatibility(
      makeViewer({}, [{ size: 'large' }]),
      makeCandidate({}, [{ size: 'large' }]),
    );
    expect(texts(same)).toContain('Both have large dogs');
    const apart = petCompatibility(
      makeViewer({}, [{ size: 'small' }]),
      makeCandidate({}, [{ size: 'giant' }]),
    );
    expect(apart.reasons).toContainEqual({
      text: 'Big size difference between your dogs',
      tone: 'caution',
    });
    expect(same.score).toBeGreaterThan(apart.score);
  });

  it('ignores dogs with unknown size and non-dog pairs', () => {
    const unknown = petCompatibility(
      makeViewer({}, [{ size: undefined }]),
      makeCandidate({}, [{ size: 'giant' }]),
    );
    expect(texts(unknown).some((t) => /size|large|small|giant/i.test(t))).toBe(false);
  });
});

describe('allergies', () => {
  it('a viewer allergic to cats vs a cat owner scores very low with a clear reason', () => {
    const c = petCompatibility(
      makeViewer({ allergies: ['cat'] }, []),
      makeCandidate({}, [{ species: 'cat', size: undefined }]),
    );
    expect(c.score).toBeLessThanOrEqual(MATCHING_CONFIG.pet.caps.allergy);
    expect(c.reasons[0]!.tone).toBe('caution');
    expect(c.reasons[0]!.text).toMatch(/allergic to cats/);
  });

  it('works the other way round', () => {
    const c = petCompatibility(
      makeViewer({}, [{ species: 'dog' }]),
      makeCandidate({ allergies: ['dog'] }, []),
    );
    expect(c.score).toBeLessThanOrEqual(MATCHING_CONFIG.pet.caps.allergy);
    expect(texts(c)[0]).toMatch(/allergic to dogs, and you have one/);
  });

  it('an allergy to a species they do not own has no effect', () => {
    const withAllergy = petCompatibility(makeViewer({ allergies: ['rabbit'] }), makeCandidate());
    const without = petCompatibility(makeViewer(), makeCandidate());
    expect(withAllergy.score).toBe(without.score);
  });

  it('beats every positive: great energy and size cannot rescue an allergy', () => {
    const c = petCompatibility(
      makeViewer({ allergies: ['dog'] }, [{ energy: 'high', size: 'large' }]),
      makeCandidate({}, [{ energy: 'high', size: 'large' }]),
    );
    expect(c.score).toBeLessThanOrEqual(MATCHING_CONFIG.pet.caps.allergy);
  });
});

describe('animal lovers and pet-less users', () => {
  it('a lover open to dogs vs a dog owner is a strong, explained match', () => {
    const c = petCompatibility(
      lover({ firstName: 'Alex', gender: 'woman', interestedIn: ['man'] }),
      makeCandidate({}, [{ species: 'dog' }]),
    );
    expect(c.informative).toBe(true);
    expect(c.score).toBeGreaterThanOrEqual(80);
    expect(texts(c)).toContain('You are open to dating someone with dogs');
  });

  it('a lover not open to cats vs a cat owner is capped low with a caution', () => {
    const c = petCompatibility(
      lover(
        { gender: 'woman', interestedIn: ['man'] },
        { lovedSpecies: ['dog'], openToPetSpecies: ['dog'] },
      ),
      makeCandidate({}, [{ species: 'cat', size: undefined }]),
    );
    expect(c.score).toBeLessThanOrEqual(MATCHING_CONFIG.pet.caps.loverNotOpen);
    expect(c.reasons[0]!.tone).toBe('caution');
  });

  it('loving a species lifts the score and is mentioned', () => {
    const c = petCompatibility(
      lover(
        { gender: 'woman', interestedIn: ['man'] },
        { lovedSpecies: ['cat'], openToPetSpecies: ['cat'] },
      ),
      makeCandidate({}, [{ species: 'cat', size: undefined }]),
    );
    expect(c.score).toBeGreaterThanOrEqual(MATCHING_CONFIG.pet.lovedSpeciesFloor);
    expect(texts(c)).toContain('You love cats');
  });

  it('mixed household: open to dogs but not cats is half-open, with the cat flagged', () => {
    const c = petCompatibility(
      lover(
        { gender: 'woman', interestedIn: ['man'] },
        { lovedSpecies: [], openToPetSpecies: ['dog'] },
      ),
      makeCandidate({}, [{ species: 'dog' }, { species: 'cat', size: undefined }]),
    );
    expect(texts(c)).toContain("You aren't open to dating someone with cats");
    expect(c.score).toBeGreaterThan(MATCHING_CONFIG.pet.caps.loverNotOpen);
    expect(c.score).toBeLessThan(80);
  });

  it('describes the lover in the third person when THEY are the lover', () => {
    const c = petCompatibility(
      makeViewer({}, [{ species: 'cat', size: undefined }]),
      lover(
        { firstName: 'Sam', gender: 'man', interestedIn: ['woman'] },
        { lovedSpecies: [], openToPetSpecies: ['dog'] },
      ),
    );
    expect(texts(c)[0]).toBe("Sam isn't open to dating someone with cats");
  });

  it('two lovers: shared favorites are a plus, otherwise there is nothing to say', () => {
    const a = lover(
      { gender: 'woman', interestedIn: ['man'] },
      { lovedSpecies: ['dog', 'cat'], openToPetSpecies: [] },
    );
    const b = lover(
      { gender: 'man', interestedIn: ['woman'] },
      { lovedSpecies: ['cat', 'dog'], openToPetSpecies: [] },
    );
    const shared = petCompatibility(a, b);
    expect(texts(shared)).toContain('You both love dogs and cats');
    expect(shared.score).toBe(MATCHING_CONFIG.pet.bothLoveScore);

    const c = lover(
      { gender: 'man', interestedIn: ['woman'] },
      { lovedSpecies: ['bird'], openToPetSpecies: [] },
    );
    const none = petCompatibility(a, c);
    expect(none.informative).toBe(false);
    expect(none.reasons).toEqual([]);
    expect(none.score).toBe(MATCHING_CONFIG.pet.neutral);
  });

  it('an owner with no pets recorded is treated like a pet-less user, without crashing', () => {
    const c = petCompatibility(makeViewer({}, []), makeCandidate({}, []));
    expect(c.informative).toBe(false);
  });
});

describe('scoring mechanics', () => {
  it('maps scores to labels at the configured thresholds', () => {
    expect(compatibilityLabel(100)).toBe('great');
    expect(compatibilityLabel(80)).toBe('great');
    expect(compatibilityLabel(79)).toBe('good');
    expect(compatibilityLabel(60)).toBe('good');
    expect(compatibilityLabel(59)).toBe('okay');
    expect(compatibilityLabel(40)).toBe('okay');
    expect(compatibilityLabel(39)).toBe('caution');
    expect(compatibilityLabel(0)).toBe('caution');
  });

  it('reads weights from the config object it is given', () => {
    const viewer = makeViewer({}, [{ energy: 'low' }]);
    const candidate = makeCandidate({}, [{ energy: 'high' }]);
    const normal = petCompatibility(viewer, candidate);
    const harsher = petCompatibility(viewer, candidate, {
      ...MATCHING_CONFIG,
      pet: { ...MATCHING_CONFIG.pet, energyScores: [100, 0, 0] },
    });
    expect(harsher.score).toBeLessThan(normal.score);
  });

  it('always returns an integer 0–100, and no reasons when uninformative, for every seeded pair', () => {
    const { users, pets } = buildSeed();
    const profiles: Profile[] = users.map((user) => ({
      user,
      pets: pets.filter((p) => p.ownerId === user.id),
    }));
    for (const a of profiles) {
      for (const b of profiles) {
        if (a === b) continue;
        const c = petCompatibility(a, b);
        expect(Number.isInteger(c.score)).toBe(true);
        expect(c.score).toBeGreaterThanOrEqual(0);
        expect(c.score).toBeLessThanOrEqual(100);
        if (!c.informative) expect(c.reasons).toEqual([]);
      }
    }
  });
});
