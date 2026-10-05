/**
 * Editable pet form state and its validation. Strings stay strings (text inputs) until saved.
 */
import { config } from '@/config';
import type { DogSize, EnergyLevel, Pet, Photo, Species, Tri } from './types';

export interface PetDraft {
  name: string;
  species: Species;
  breed: string;
  /** Text input value; parsed on save. */
  age: string;
  size: DogSize | null;
  energy: EnergyLevel;
  goodWith: { dogs: Tri; cats: Tri; kids: Tri };
  personalityTags: string[];
  photos: Photo[];
}

export const emptyPetDraft = (): PetDraft => ({
  name: '',
  species: 'dog',
  breed: '',
  age: '',
  size: null,
  energy: 'medium',
  goodWith: { dogs: 'unsure', cats: 'unsure', kids: 'unsure' },
  personalityTags: [],
  photos: [],
});

export const petToDraft = (pet: Pet): PetDraft => ({
  name: pet.name,
  species: pet.species,
  breed: pet.breed ?? '',
  age: String(pet.ageYears),
  size: pet.size ?? null,
  energy: pet.energy,
  goodWith: { ...pet.goodWith },
  personalityTags: [...pet.personalityTags],
  photos: [...pet.photos],
});

/** Whole years, 0–40. Returns null when the text isn't a usable age. */
export function parsePetAge(text: string): number | null {
  const trimmed = text.trim();
  if (!/^\d{1,2}$/.test(trimmed)) return null;
  const n = Number(trimmed);
  return n >= 0 && n <= 40 ? n : null;
}

export const validatePetBasics = (d: PetDraft): boolean => d.name.trim().length > 0;

export const validatePetDetails = (d: PetDraft): boolean =>
  parsePetAge(d.age) !== null && (d.species !== 'dog' || d.size !== null);

export const validatePetPhotos = (d: PetDraft): boolean => d.photos.length >= config.minPetPhotos;

export const validatePet = (d: PetDraft): boolean =>
  validatePetBasics(d) && validatePetDetails(d) && validatePetPhotos(d);

/** Fields as stored on a Pet. Size is dropped for non-dogs; empty breed becomes undefined. */
export function draftToPetFields(d: PetDraft): Omit<Pet, 'id' | 'ownerId'> {
  return {
    name: d.name.trim(),
    species: d.species,
    breed: d.breed.trim() || undefined,
    ageYears: parsePetAge(d.age) ?? 0,
    size: d.species === 'dog' ? (d.size ?? undefined) : undefined,
    energy: d.energy,
    goodWith: { ...d.goodWith },
    personalityTags: [...d.personalityTags],
    photos: [...d.photos],
  };
}
