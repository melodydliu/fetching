/**
 * Database rows <-> domain types. Pure functions (no network), so they're unit-tested.
 * Column names are snake_case in Postgres, camelCase in the app.
 */
import { defaultDealbreakers, defaultNotifications, defaultPreferences } from '@/domain/defaults';
import type {
  DatePlan,
  Like,
  Match,
  Message,
  Pet,
  Photo,
  PromptAnswer,
  User,
} from '@/domain/types';
import type { MatchSummary } from '../types';

export interface PhotoRow {
  id: string;
  url: string;
  caption: string | null;
  position: number;
  pet_id?: string | null;
}

export interface PromptAnswerRow {
  id: string;
  prompt_id: string;
  answer: string;
  position: number;
}

export interface ProfileRow {
  id: string;
  kind: User['kind'];
  first_name: string;
  birthdate: string | null;
  gender: User['gender'] | null;
  interested_in: User['interestedIn'];
  city: string | null;
  relationship_goals: User['relationshipGoals'];
  job: string | null;
  hometown: string | null;
  allergies: User['allergies'];
  loved_species: User['allergies'] | null;
  open_to_pet_species: User['allergies'] | null;
  preferences: Partial<User['preferences']>;
  dealbreakers: Partial<User['dealbreakers']>;
  notifications: Partial<User['notifications']>;
  paused: boolean;
  onboarding_complete: boolean;
  onboarding_steps: string[];
  created_at: string;
  last_active_at: string;
  photos?: PhotoRow[];
  prompt_answers?: PromptAnswerRow[];
}

export interface PetRow {
  id: string;
  owner_id: string;
  name: string;
  species: Pet['species'];
  breed: string | null;
  age_years: number | string | null;
  size: Pet['size'] | null;
  energy: Pet['energy'];
  good_with_dogs: Pet['goodWith']['dogs'];
  good_with_cats: Pet['goodWith']['cats'];
  good_with_kids: Pet['goodWith']['kids'];
  personality_tags: string[];
  position: number;
  photos?: PhotoRow[];
}

/** Select strings, so every query asks for exactly the columns the mappers expect. */
export const PHOTO_COLUMNS = 'id, url, caption, position, pet_id';
export const PROFILE_SELECT = `*, photos(${PHOTO_COLUMNS}), prompt_answers(id, prompt_id, answer, position)`;
export const PET_SELECT = `*, photos(${PHOTO_COLUMNS})`;

const byPosition = <T extends { position: number }>(rows: T[] = []) =>
  [...rows].sort((a, b) => a.position - b.position);

export const photoFromRow = (row: PhotoRow): Photo => ({
  id: row.id,
  url: row.url,
  ...(row.caption ? { caption: row.caption } : {}),
});

export const promptAnswerFromRow = (row: PromptAnswerRow): PromptAnswer => ({
  id: row.id,
  promptId: row.prompt_id,
  answer: row.answer,
});

/**
 * `location` is the owner-only coordinates row. Everyone else's coordinates are private by
 * design, so they come back as 0/0: use the distance the server computes, not these.
 */
export function userFromRow(row: ProfileRow, coords?: { lat: number; lng: number }): User {
  const hasLoverFields = row.loved_species !== null || row.open_to_pet_species !== null;
  return {
    id: row.id,
    kind: row.kind,
    firstName: row.first_name,
    birthdate: row.birthdate ?? '',
    gender: row.gender ?? 'woman',
    interestedIn: row.interested_in ?? [],
    location: { city: row.city ?? '', lat: coords?.lat ?? 0, lng: coords?.lng ?? 0 },
    relationshipGoals: row.relationship_goals ?? [],
    basics: {
      ...(row.job ? { job: row.job } : {}),
      ...(row.hometown ? { hometown: row.hometown } : {}),
    },
    // Person photos only: pet photos live on the pet.
    photos: byPosition((row.photos ?? []).filter((p) => !p.pet_id)).map(photoFromRow),
    promptAnswers: byPosition(row.prompt_answers).map(promptAnswerFromRow),
    allergies: row.allergies ?? [],
    ...(hasLoverFields
      ? {
          animalLover: {
            lovedSpecies: row.loved_species ?? [],
            openToPetSpecies: row.open_to_pet_species ?? [],
          },
        }
      : {}),
    // A bare account has empty JSON here; fill the gaps with the app's defaults.
    preferences: { ...defaultPreferences(30, []), ...row.preferences },
    dealbreakers: { ...defaultDealbreakers(), ...row.dealbreakers },
    notifications: { ...defaultNotifications(), ...row.notifications },
    paused: row.paused,
    onboardingComplete: row.onboarding_complete,
    onboardingSteps: row.onboarding_steps ?? [],
    createdAt: row.created_at,
    lastActiveAt: row.last_active_at,
  };
}

/** Domain patch -> columns on `profiles`. Only keys present in the patch are included. */
export function profilePatchToRow(patch: Partial<Omit<User, 'id'>>): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  if (patch.kind !== undefined) row.kind = patch.kind;
  if (patch.firstName !== undefined) row.first_name = patch.firstName;
  if (patch.birthdate !== undefined) row.birthdate = patch.birthdate || null;
  if (patch.gender !== undefined) row.gender = patch.gender;
  if (patch.interestedIn !== undefined) row.interested_in = patch.interestedIn;
  if (patch.location !== undefined) row.city = patch.location.city;
  if (patch.relationshipGoals !== undefined) row.relationship_goals = patch.relationshipGoals;
  if (patch.basics !== undefined) {
    row.job = patch.basics.job ?? null;
    row.hometown = patch.basics.hometown ?? null;
  }
  if (patch.allergies !== undefined) row.allergies = patch.allergies;
  if ('animalLover' in patch) {
    row.loved_species = patch.animalLover?.lovedSpecies ?? null;
    row.open_to_pet_species = patch.animalLover?.openToPetSpecies ?? null;
  }
  if (patch.preferences !== undefined) row.preferences = patch.preferences;
  if (patch.dealbreakers !== undefined) row.dealbreakers = patch.dealbreakers;
  if (patch.notifications !== undefined) row.notifications = patch.notifications;
  if (patch.paused !== undefined) row.paused = patch.paused;
  if (patch.onboardingComplete !== undefined) row.onboarding_complete = patch.onboardingComplete;
  if (patch.onboardingSteps !== undefined) row.onboarding_steps = patch.onboardingSteps;
  return row;
}

export function petFromRow(row: PetRow): Pet {
  return {
    id: row.id,
    ownerId: row.owner_id,
    name: row.name,
    species: row.species,
    ...(row.breed ? { breed: row.breed } : {}),
    ...(row.age_years === null ? {} : { ageYears: Number(row.age_years) }),
    ...(row.size ? { size: row.size } : {}),
    energy: row.energy,
    goodWith: { dogs: row.good_with_dogs, cats: row.good_with_cats, kids: row.good_with_kids },
    personalityTags: row.personality_tags ?? [],
    photos: byPosition(row.photos).map(photoFromRow),
  };
}

/** Domain pet fields -> columns on `pets` (photos are handled separately). */
export function petPatchToRow(
  patch: Partial<Omit<Pet, 'id' | 'ownerId'>>,
): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  if (patch.name !== undefined) row.name = patch.name;
  if (patch.species !== undefined) row.species = patch.species;
  if ('breed' in patch) row.breed = patch.breed ?? null;
  if ('ageYears' in patch) row.age_years = patch.ageYears ?? null;
  if ('size' in patch) row.size = patch.size ?? null;
  if (patch.energy !== undefined) row.energy = patch.energy;
  if (patch.goodWith !== undefined) {
    row.good_with_dogs = patch.goodWith.dogs;
    row.good_with_cats = patch.goodWith.cats;
    row.good_with_kids = patch.goodWith.kids;
  }
  if (patch.personalityTags !== undefined) row.personality_tags = patch.personalityTags;
  return row;
}

/** Storage path inside the photos bucket for one of our own uploads, else null (e.g. seed URLs). */
export function storagePathFromUrl(url: string, bucket = 'photos'): string | null {
  const marker = `/storage/v1/object/public/${bucket}/`;
  const at = url.indexOf(marker);
  return at === -1 ? null : decodeURIComponent(url.slice(at + marker.length).split('?')[0]!);
}

// ---------------------------------------------------------------------------
// likes, matches, messages
// ---------------------------------------------------------------------------
export interface LikeRow {
  id: string;
  from_user_id: string;
  to_user_id: string;
  target_type: 'photo' | 'prompt' | 'pet';
  target_id: string;
  comment: string | null;
  is_treat: boolean;
  removed_at: string | null;
  created_at: string;
}

export const likeFromRow = (row: LikeRow): Like => ({
  id: row.id,
  fromUserId: row.from_user_id,
  toUserId: row.to_user_id,
  target: { type: row.target_type, id: row.target_id },
  ...(row.comment ? { comment: row.comment } : {}),
  isTreat: row.is_treat,
  createdAt: row.created_at,
});

export interface MatchRow {
  id: string;
  user_a: string;
  user_b: string;
  created_at: string;
}

export const matchFromRow = (row: MatchRow): Match => ({
  id: row.id,
  userIds: [row.user_a, row.user_b],
  createdAt: row.created_at,
});

export interface MessageRow {
  id: string;
  match_id: string;
  sender_id: string;
  kind: Message['kind'];
  body: string | null;
  date_plan_id: string | null;
  created_at: string;
  read_at: string | null;
}

export const messageFromRow = (row: MessageRow): Message => ({
  id: row.id,
  matchId: row.match_id,
  senderId: row.sender_id,
  kind: row.kind,
  ...(row.body !== null ? { text: row.body } : {}),
  ...(row.date_plan_id ? { datePlanId: row.date_plan_id } : {}),
  createdAt: row.created_at,
  ...(row.read_at ? { readAt: row.read_at } : {}),
});

/** One row of the `match_summaries` view. */
export interface MatchSummaryRow {
  match_id: string;
  user_a: string;
  user_b: string;
  matched_at: string;
  last_message_id: string | null;
  last_sender_id: string | null;
  last_kind: Message['kind'] | null;
  last_body: string | null;
  last_date_plan_id: string | null;
  last_message_at: string | null;
  last_read_at: string | null;
}

export function matchSummaryFromRow(row: MatchSummaryRow, viewerId: string): MatchSummary {
  const lastMessage: Message | undefined = row.last_message_id
    ? messageFromRow({
        id: row.last_message_id,
        match_id: row.match_id,
        sender_id: row.last_sender_id!,
        kind: row.last_kind!,
        body: row.last_body,
        date_plan_id: row.last_date_plan_id,
        created_at: row.last_message_at!,
        read_at: row.last_read_at,
      })
    : undefined;
  return {
    match: matchFromRow({
      id: row.match_id,
      user_a: row.user_a,
      user_b: row.user_b,
      created_at: row.matched_at,
    }),
    otherUserId: row.user_a === viewerId ? row.user_b : row.user_a,
    lastMessage,
    yourTurn: !!lastMessage && lastMessage.senderId !== viewerId,
    isNew: !lastMessage,
  };
}

// ---------------------------------------------------------------------------
// Play Dates
// ---------------------------------------------------------------------------
export interface DatePlanRow {
  id: string;
  match_id: string;
  proposer_id: string;
  kind: DatePlan['kind'];
  custom_label: string | null;
  location: string | null;
  starts_at: string;
  status: DatePlan['status'];
  note: string | null;
  responded_by_id: string | null;
  created_at: string;
}

export const datePlanFromRow = (row: DatePlanRow): DatePlan => ({
  id: row.id,
  matchId: row.match_id,
  proposerId: row.proposer_id,
  kind: row.kind,
  ...(row.custom_label ? { customLabel: row.custom_label } : {}),
  ...(row.location ? { location: row.location } : {}),
  startsAt: row.starts_at,
  status: row.status,
  ...(row.note ? { note: row.note } : {}),
  ...(row.responded_by_id ? { respondedById: row.responded_by_id } : {}),
  createdAt: row.created_at,
});
