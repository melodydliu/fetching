import { promptById } from '@/config/prompts';
import type { LikeTarget, Pet, Photo, Profile, PromptAnswer } from './types';

export type ProfileBlock =
  | { type: 'photo'; photo: Photo }
  | { type: 'prompt'; answer: PromptAnswer }
  | { type: 'pet'; pet: Pet }
  | { type: 'animal_lover' };

export type ProfileSectionKind = 'person' | 'pets' | 'animal_lover';

/** One clearly labelled part of a profile: the person, their pets, or their love of animals. */
export interface ProfileSection {
  kind: ProfileSectionKind;
  /** Full heading, e.g. "Meet Biscuit & Miso". */
  title: string;
  /** Short label for the jump tabs, e.g. "Biscuit & Miso". */
  label: string;
  blocks: ProfileBlock[];
}

const petNames = (pets: Pet[]): { title: string; label: string } => {
  if (pets.length === 1) return { title: `Meet ${pets[0]!.name}`, label: pets[0]!.name };
  if (pets.length === 2) {
    const both = `${pets[0]!.name} & ${pets[1]!.name}`;
    return { title: `Meet ${both}`, label: both };
  }
  return { title: 'Meet the pets', label: 'Pets' };
};

const isPetPrompt = (answer: PromptAnswer) => promptById(answer.promptId)?.category === 'pet';

/**
 * Splits a profile into sections so a person and their pets never blur together:
 *   1. "About <name>": their photos and personal prompts, alternating.
 *   2. "Meet <pet>": the pets, then the pet-themed prompts they answered.
 * Animal lovers get an "animals" section instead. Every block is one thing you can like.
 */
export function buildProfileSections(profile: Profile): ProfileSection[] {
  const { user, pets } = profile;
  const photos = [...user.photos];
  const personalPrompts = user.promptAnswers.filter((a) => !isPetPrompt(a));
  const petPrompts = user.promptAnswers.filter(isPetPrompt);
  const hasPets = user.kind === 'pet_owner' && pets.length > 0;

  // Pet prompts have a home in the pet section; without pets they'd be orphans, so keep them in "About".
  const aboutPrompts = hasPets ? personalPrompts : [...personalPrompts, ...petPrompts];
  const person: ProfileBlock[] = [];
  const takePhoto = () => {
    const photo = photos.shift();
    if (photo) person.push({ type: 'photo', photo });
  };
  const takePrompt = () => {
    const answer = aboutPrompts.shift();
    if (answer) person.push({ type: 'prompt', answer });
  };
  takePhoto();
  takePrompt();
  takePhoto();
  takePrompt();
  takePhoto();
  takePrompt();
  while (photos.length || aboutPrompts.length) {
    takePhoto();
    takePrompt();
  }

  const sections: ProfileSection[] = [];
  if (person.length) {
    sections.push({
      kind: 'person',
      title: `About ${user.firstName}`,
      label: user.firstName,
      blocks: person,
    });
  }

  if (hasPets) {
    sections.push({
      kind: 'pets',
      ...petNames(pets),
      blocks: [
        ...pets.map((pet): ProfileBlock => ({ type: 'pet', pet })),
        ...petPrompts.map((answer): ProfileBlock => ({ type: 'prompt', answer })),
      ],
    });
  } else if (user.kind === 'animal_lover') {
    sections.push({
      kind: 'animal_lover',
      title: `${user.firstName} loves animals`,
      label: 'Animals',
      blocks: [{ type: 'animal_lover' }],
    });
  }
  return sections;
}

/** Everything likeable in display order. Handy for counting and for tests. */
export const flattenSections = (sections: ProfileSection[]): ProfileBlock[] =>
  sections.flatMap((s) => s.blocks);

/** What a like on this block points at. The animal-lover summary can't be liked on its own. */
export function likeTargetOf(block: ProfileBlock): LikeTarget | null {
  switch (block.type) {
    case 'photo':
      return { type: 'photo', id: block.photo.id };
    case 'prompt':
      return { type: 'prompt', id: block.answer.id };
    case 'pet':
      return { type: 'pet', id: block.pet.id };
    case 'animal_lover':
      return null;
  }
}
