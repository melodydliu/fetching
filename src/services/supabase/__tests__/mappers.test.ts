import {
  petFromRow,
  petPatchToRow,
  type PetRow,
  profilePatchToRow,
  type ProfileRow,
  storagePathFromUrl,
  userFromRow,
} from '../mappers';

const bareRow: ProfileRow = {
  id: 'u1',
  kind: 'animal_lover',
  first_name: '',
  birthdate: null,
  gender: null,
  interested_in: [],
  city: null,
  relationship_goals: [],
  job: null,
  hometown: null,
  allergies: [],
  loved_species: null,
  open_to_pet_species: null,
  preferences: {},
  dealbreakers: {},
  notifications: {},
  paused: false,
  onboarding_complete: false,
  onboarding_steps: [],
  created_at: '2026-10-06T00:00:00Z',
  last_active_at: '2026-10-06T00:00:00Z',
};

describe('userFromRow', () => {
  it('turns a bare, just-signed-up row into a usable user with the app defaults', () => {
    const user = userFromRow(bareRow);
    expect(user.firstName).toBe('');
    expect(user.birthdate).toBe('');
    expect(user.onboardingComplete).toBe(false);
    expect(user.preferences.maxDistanceMiles).toBe(25);
    expect(user.dealbreakers.age).toBe(false);
    expect(user.notifications.matches).toBe(true);
    expect(user.animalLover).toBeUndefined();
    expect(user.photos).toEqual([]);
  });

  it("keeps someone else's coordinates private (0/0) but shows the owner's own", () => {
    expect(userFromRow({ ...bareRow, city: 'Oakland' }).location).toEqual({
      city: 'Oakland',
      lat: 0,
      lng: 0,
    });
    expect(userFromRow(bareRow, { lat: 37.8, lng: -122.3 }).location).toMatchObject({
      lat: 37.8,
      lng: -122.3,
    });
  });

  it('orders photos and prompts by position, excludes pet photos, and keeps captions', () => {
    const user = userFromRow({
      ...bareRow,
      photos: [
        { id: 'b', url: 'u-b', caption: null, position: 1 },
        { id: 'pet-photo', url: 'u-p', caption: null, position: 0, pet_id: 'pet1' },
        { id: 'a', url: 'u-a', caption: 'Hi', position: 0 },
      ],
      prompt_answers: [
        { id: 'p2', prompt_id: 'x', answer: 'second', position: 1 },
        { id: 'p1', prompt_id: 'y', answer: 'first', position: 0 },
      ],
    });
    expect(user.photos).toEqual([
      { id: 'a', url: 'u-a', caption: 'Hi' },
      { id: 'b', url: 'u-b' },
    ]);
    expect(user.promptAnswers.map((p) => p.answer)).toEqual(['first', 'second']);
  });

  it('builds the animal-lover profile only when those columns are set', () => {
    const user = userFromRow({ ...bareRow, loved_species: ['dog'], open_to_pet_species: null });
    expect(user.animalLover).toEqual({ lovedSpecies: ['dog'], openToPetSpecies: [] });
  });
});

describe('profilePatchToRow', () => {
  it('only includes the fields in the patch', () => {
    expect(profilePatchToRow({ firstName: 'Maya', paused: true })).toEqual({
      first_name: 'Maya',
      paused: true,
    });
    expect(profilePatchToRow({})).toEqual({});
  });

  it('maps nested fields and clears optional ones', () => {
    expect(
      profilePatchToRow({
        location: { city: 'Oakland', lat: 1, lng: 2 },
        basics: { job: 'Vet' },
        birthdate: '',
        animalLover: undefined,
      }),
    ).toEqual({
      city: 'Oakland',
      job: 'Vet',
      hometown: null,
      birthdate: null,
      loved_species: null,
      open_to_pet_species: null,
    });
  });

  it('never writes photos, prompts, ids or timestamps (those have their own paths)', () => {
    const row = profilePatchToRow({
      photos: [{ id: 'p', url: 'u' }],
      promptAnswers: [],
      createdAt: 'x',
      lastActiveAt: 'y',
    });
    expect(row).toEqual({});
  });
});

const petRow: PetRow = {
  id: 'pet1',
  owner_id: 'u1',
  name: 'Biscuit',
  species: 'dog',
  breed: null,
  age_years: '3.5',
  size: null,
  energy: 'high',
  good_with_dogs: 'yes',
  good_with_cats: 'unsure',
  good_with_kids: 'no',
  personality_tags: ['goofy'],
  position: 0,
  photos: [
    { id: 'b', url: 'u-b', caption: null, position: 1 },
    { id: 'a', url: 'u-a', caption: 'Zoomies', position: 0 },
  ],
};

describe('pets', () => {
  it('maps a row, turning the numeric age into a number and ordering photos', () => {
    const pet = petFromRow(petRow);
    expect(pet.ageYears).toBe(3.5);
    expect(pet.goodWith).toEqual({ dogs: 'yes', cats: 'unsure', kids: 'no' });
    expect(pet.size).toBeUndefined();
    expect(pet.photos).toEqual([
      { id: 'a', url: 'u-a', caption: 'Zoomies' },
      { id: 'b', url: 'u-b' },
    ]);
  });

  it('treats a missing age as no age, and clears it when explicitly unset', () => {
    const pet = petFromRow({ ...petRow, age_years: null, breed: null });
    expect(pet.ageYears).toBeUndefined();
    expect('ageYears' in pet).toBe(false);
    expect(petPatchToRow({ ageYears: undefined })).toEqual({ age_years: null });
    expect(petPatchToRow({ ageYears: 0 })).toEqual({ age_years: 0 });
    expect(petPatchToRow({ name: 'B' })).toEqual({ name: 'B' }); // untouched when not in the patch
  });

  it('maps a patch, clearing breed/size when explicitly unset', () => {
    expect(
      petPatchToRow({
        name: 'B',
        breed: undefined,
        size: undefined,
        goodWith: { dogs: 'no', cats: 'yes', kids: 'yes' },
      }),
    ).toEqual({
      name: 'B',
      breed: null,
      size: null,
      good_with_dogs: 'no',
      good_with_cats: 'yes',
      good_with_kids: 'yes',
    });
    expect(petPatchToRow({ energy: 'low' })).toEqual({ energy: 'low' });
  });
});

describe('storagePathFromUrl', () => {
  it('extracts the path for our own uploads and ignores everything else', () => {
    const own = 'https://x.supabase.co/storage/v1/object/public/photos/user-1/photo-1.jpg';
    expect(storagePathFromUrl(own)).toBe('user-1/photo-1.jpg');
    expect(storagePathFromUrl(`${own}?t=1`)).toBe('user-1/photo-1.jpg');
    expect(storagePathFromUrl('https://i.pravatar.cc/400?img=3')).toBeNull();
    expect(storagePathFromUrl('placeholder://rabbit')).toBeNull();
  });
});
