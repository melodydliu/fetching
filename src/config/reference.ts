import type {
  DogSize,
  EnergyLevel,
  Gender,
  PlayDateKind,
  ReportReason,
  RelationshipGoal,
  Species,
} from '@/domain/types';

export const SPECIES: readonly Species[] = ['dog', 'cat', 'rabbit', 'bird', 'other'];

/** Searchable lists are only offered for dogs and cats; other species are free text. */
export const DOG_BREEDS: readonly string[] = [
  'Mixed breed',
  'Australian Shepherd',
  'Beagle',
  'Border Collie',
  'Boxer',
  'Chihuahua',
  'Corgi',
  'Dachshund',
  'French Bulldog',
  'German Shepherd',
  'Golden Retriever',
  'Labrador Retriever',
  'Poodle',
  'Pug',
  'Shiba Inu',
  'Siberian Husky',
];

export const CAT_BREEDS: readonly string[] = [
  'Domestic shorthair',
  'Domestic longhair',
  'Bengal',
  'British Shorthair',
  'Maine Coon',
  'Persian',
  'Ragdoll',
  'Siamese',
  'Sphynx',
];

export const DOG_SIZES: readonly DogSize[] = ['small', 'medium', 'large', 'giant'];
export const ENERGY_LEVELS: readonly EnergyLevel[] = ['low', 'medium', 'high'];

export const PERSONALITY_TAGS: readonly string[] = [
  'cuddler',
  'fetch-obsessed',
  'shy at first',
  'park regular',
  'couch potato',
  'adventurer',
  'foodie',
  'drama queen',
  'gentle giant',
  'professional napper',
  'social butterfly',
  'zoomie champion',
  'velcro pet',
  'independent',
  'chatty',
  'sunbather',
];

export const RELATIONSHIP_GOAL_LABELS: Record<RelationshipGoal, string> = {
  long_term: 'Long-term relationship',
  something_casual: 'Something casual',
  friends_first: 'Friends first',
  not_sure: 'Still figuring it out',
};

export const PLAY_DATE_LABELS: Record<PlayDateKind, string> = {
  dog_park: 'Dog park',
  pet_friendly_cafe: 'Pet-friendly café',
  hiking_trail: 'Hiking trail',
  beach: 'Beach',
  custom: 'Something else',
};

export const SPECIES_LABELS: Record<Species, string> = {
  dog: 'Dog',
  cat: 'Cat',
  rabbit: 'Rabbit',
  bird: 'Bird',
  other: 'Other',
};

export const GENDER_OPTIONS: { value: Gender; label: string }[] = [
  { value: 'woman', label: 'Woman' },
  { value: 'man', label: 'Man' },
  { value: 'nonbinary', label: 'Nonbinary' },
];

/** Plural labels for "interested in". */
export const INTEREST_OPTIONS: { value: Gender; label: string }[] = [
  { value: 'woman', label: 'Women' },
  { value: 'man', label: 'Men' },
  { value: 'nonbinary', label: 'Nonbinary people' },
];

export const REPORT_REASONS: { value: ReportReason; label: string }[] = [
  { value: 'fake_profile', label: 'Fake profile' },
  { value: 'inappropriate_photos', label: 'Inappropriate photos' },
  { value: 'harassment', label: 'Harassment' },
  { value: 'spam', label: 'Spam or scam' },
  { value: 'underage', label: 'Seems underage' },
  { value: 'animal_welfare', label: 'Animal welfare concern' },
  { value: 'other', label: 'Something else' },
];
