import {
  draftToPetFields,
  emptyPetDraft,
  parsePetAge,
  petToDraft,
  validatePet,
  validatePetBasics,
  validatePetDetails,
  validatePetPhotos,
} from '../petDraft';
import type { Photo } from '../types';

const photos = (n: number): Photo[] =>
  Array.from({ length: n }, (_, i) => ({ id: `p${i}`, url: `u${i}` }));

describe('parsePetAge', () => {
  it.each([
    ['3', 3],
    [' 12 ', 12],
    ['0', 0],
    ['40', 40],
  ])('accepts %p', (text, expected) => expect(parsePetAge(text)).toBe(expected));

  it.each(['', 'abc', '-1', '3.5', '41', '100'])('rejects %p', (text) =>
    expect(parsePetAge(text)).toBeNull(),
  );
});

describe('validation', () => {
  it('requires a name', () => {
    expect(validatePetBasics({ ...emptyPetDraft(), name: '  ' })).toBe(false);
    expect(validatePetBasics({ ...emptyPetDraft(), name: 'Biscuit' })).toBe(true);
  });

  it('requires a size for dogs only', () => {
    const dog = { ...emptyPetDraft(), species: 'dog' as const, age: '3' };
    expect(validatePetDetails(dog)).toBe(false);
    expect(validatePetDetails({ ...dog, size: 'small' })).toBe(true);
    expect(validatePetDetails({ ...dog, species: 'cat' })).toBe(true);
  });

  it('treats breed and age as optional, but rejects an age that cannot be used', () => {
    const cat = { ...emptyPetDraft(), species: 'cat' as const };
    expect(validatePetDetails({ ...cat, breed: '', age: '' })).toBe(true);
    expect(validatePetDetails({ ...cat, age: '4' })).toBe(true);
    expect(validatePetDetails({ ...cat, age: '  ' })).toBe(true);
    expect(validatePetDetails({ ...cat, age: '75' })).toBe(false);
  });

  it('leaves age and breed out of the saved pet when they were left blank', () => {
    const fields = draftToPetFields({ ...emptyPetDraft(), name: 'Miso', species: 'cat' });
    expect(fields.ageYears).toBeUndefined();
    expect(fields.breed).toBeUndefined();
    expect(petToDraft({ id: 'p', ownerId: 'u', ...fields }).age).toBe('');
  });

  it('requires 3+ photos', () => {
    expect(validatePetPhotos({ ...emptyPetDraft(), photos: photos(2) })).toBe(false);
    expect(validatePetPhotos({ ...emptyPetDraft(), photos: photos(3) })).toBe(true);
  });

  it('validates a whole pet', () => {
    const ok = {
      ...emptyPetDraft(),
      name: 'Miso',
      species: 'cat' as const,
      age: '4',
      photos: photos(3),
    };
    expect(validatePet(ok)).toBe(true);
    expect(validatePet({ ...ok, photos: photos(1) })).toBe(false);
  });
});

describe('draftToPetFields', () => {
  it('trims, parses age, and drops size for non-dogs', () => {
    const fields = draftToPetFields({
      ...emptyPetDraft(),
      name: ' Miso ',
      species: 'cat',
      breed: '  ',
      age: '4',
      size: 'large',
    });
    expect(fields).toMatchObject({ name: 'Miso', ageYears: 4, breed: undefined, size: undefined });
  });

  it('keeps size for dogs and round-trips through petToDraft', () => {
    const draft = {
      ...emptyPetDraft(),
      name: 'Biscuit',
      breed: 'Beagle',
      age: '2',
      size: 'medium' as const,
      personalityTags: ['cuddler'],
      photos: photos(3),
    };
    const fields = draftToPetFields(draft);
    expect(fields.size).toBe('medium');
    expect(petToDraft({ ...fields, id: 'x', ownerId: 'y' })).toEqual(draft);
  });
});
