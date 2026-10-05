import { promptById } from '@/config/prompts';
import { buildSeed } from '@/mocks/seed';
import { buildProfileSections, flattenSections, likeTargetOf } from '../profileBlocks';
import type { Profile } from '../types';

const { users, pets } = buildSeed();
const profileOf = (id: string): Profile => ({
  user: users.find((u) => u.id === id)!,
  pets: pets.filter((p) => p.ownerId === id),
});
const owner = users.find(
  (u) => u.kind === 'pet_owner' && pets.filter((p) => p.ownerId === u.id).length === 1,
)!;
const multi = users.find((u) => pets.filter((p) => p.ownerId === u.id).length >= 2);
const lover = users.find((u) => u.kind === 'animal_lover')!;

describe('buildProfileSections', () => {
  it('splits an owner into a person section and a pets section, in that order', () => {
    const sections = buildProfileSections(profileOf(owner.id));
    expect(sections.map((s) => s.kind)).toEqual(['person', 'pets']);
  });

  it('keeps the person section to photos and personal prompts only', () => {
    const [person] = buildProfileSections(profileOf(owner.id));
    expect(person!.blocks.every((b) => b.type === 'photo' || b.type === 'prompt')).toBe(true);
    for (const b of person!.blocks) {
      if (b.type === 'prompt') expect(promptById(b.answer.promptId)?.category).not.toBe('pet');
    }
    expect(person!.blocks[0]!.type).toBe('photo');
  });

  it('puts pets first in the pets section, then the pet-themed prompts', () => {
    const pet = buildProfileSections(profileOf(owner.id)).find((s) => s.kind === 'pets')!;
    const types = pet.blocks.map((b) => b.type);
    const firstPrompt = types.indexOf('prompt');
    if (firstPrompt >= 0) expect(types.slice(0, firstPrompt).every((t) => t === 'pet')).toBe(true);
    for (const b of pet.blocks) {
      if (b.type === 'prompt') expect(promptById(b.answer.promptId)?.category).toBe('pet');
    }
  });

  it('includes every photo, prompt and pet exactly once', () => {
    const profile = profileOf(owner.id);
    const blocks = flattenSections(buildProfileSections(profile));
    expect(blocks.filter((b) => b.type === 'photo')).toHaveLength(profile.user.photos.length);
    expect(blocks.filter((b) => b.type === 'prompt')).toHaveLength(
      profile.user.promptAnswers.length,
    );
    expect(blocks.filter((b) => b.type === 'pet')).toHaveLength(profile.pets.length);
  });

  it('titles sections for the person and pet(s)', () => {
    const profile = profileOf(owner.id);
    const [person, petSection] = buildProfileSections(profile);
    expect(person!.title).toBe(`About ${profile.user.firstName}`);
    expect(person!.label).toBe(profile.user.firstName);
    expect(petSection!.title).toBe(`Meet ${profile.pets[0]!.name}`);
    expect(petSection!.label).toBe(profile.pets[0]!.name);
  });

  it('names two pets together and falls back for bigger households', () => {
    const base = profileOf(owner.id);
    const p = base.pets[0]!;
    const two: Profile = { ...base, pets: [p, { ...p, id: 'x', name: 'Miso' }] };
    expect(buildProfileSections(two).find((s) => s.kind === 'pets')!.title).toBe(
      `Meet ${p.name} & Miso`,
    );
    const four: Profile = {
      ...base,
      pets: [p, { ...p, id: 'a' }, { ...p, id: 'b' }, { ...p, id: 'c' }],
    };
    expect(buildProfileSections(four).find((s) => s.kind === 'pets')!.title).toBe('Meet the pets');
    if (multi) {
      const s = buildProfileSections(profileOf(multi.id)).find((x) => x.kind === 'pets')!;
      expect(s.blocks.filter((b) => b.type === 'pet').length).toBeGreaterThanOrEqual(2);
    }
  });

  it('gives animal lovers an animals section instead of pets', () => {
    const sections = buildProfileSections(profileOf(lover.id));
    expect(sections.map((s) => s.kind)).toEqual(['person', 'animal_lover']);
    expect(sections[1]!.blocks).toEqual([{ type: 'animal_lover' }]);
  });

  it('never strands pet prompts: an owner with no pets keeps them under "About"', () => {
    const profile = profileOf(owner.id);
    const noPets: Profile = { user: profile.user, pets: [] };
    const sections = buildProfileSections(noPets);
    expect(sections.map((s) => s.kind)).toEqual(['person']);
    expect(flattenSections(sections).filter((b) => b.type === 'prompt')).toHaveLength(
      profile.user.promptAnswers.length,
    );
  });

  it('handles a bare profile without throwing', () => {
    const bare: Profile = { user: { ...owner, photos: [], promptAnswers: [] }, pets: [] };
    expect(buildProfileSections(bare)).toEqual([]);
  });

  it('never loses content for a photo-heavy profile', () => {
    const profile = profileOf(owner.id);
    const extra = [...profile.user.photos, ...profile.user.photos];
    const blocks = flattenSections(
      buildProfileSections({ ...profile, user: { ...profile.user, photos: extra } }),
    );
    expect(blocks.filter((b) => b.type === 'photo')).toHaveLength(extra.length);
  });

  it('every seeded profile builds sections whose blocks all map to likes (except the lover summary)', () => {
    for (const u of users) {
      const sections = buildProfileSections(profileOf(u.id));
      expect(sections.length).toBeGreaterThan(0);
      for (const b of flattenSections(sections)) {
        if (b.type === 'animal_lover') expect(likeTargetOf(b)).toBeNull();
        else expect(likeTargetOf(b)!.type).toBe(b.type);
      }
    }
  });
});

describe('likeTargetOf', () => {
  it('maps each likeable block to its id', () => {
    for (const b of flattenSections(buildProfileSections(profileOf(owner.id)))) {
      const t = likeTargetOf(b)!;
      if (b.type === 'photo') expect(t.id).toBe(b.photo.id);
      if (b.type === 'prompt') expect(t.id).toBe(b.answer.id);
      if (b.type === 'pet') expect(t.id).toBe(b.pet.id);
    }
  });
});
