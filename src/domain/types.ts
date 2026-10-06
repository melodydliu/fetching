/**
 * Core domain models. Pure data: no UI, no service imports.
 * Everything the matching logic and service layer share lives here.
 */

export type ID = string;
export type ISODate = string;

export type Gender = 'woman' | 'man' | 'nonbinary';
export type Species = 'dog' | 'cat' | 'rabbit' | 'bird' | 'other';
export type DogSize = 'small' | 'medium' | 'large' | 'giant';
export type EnergyLevel = 'low' | 'medium' | 'high';
/** Used for pet "good with" fields. "unsure" is neutral, never a penalty. */
export type Tri = 'yes' | 'no' | 'unsure';
export type RelationshipGoal = 'long_term' | 'something_casual' | 'friends_first' | 'not_sure';
export type AccountKind = 'pet_owner' | 'animal_lover';

export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface Location extends GeoPoint {
  city: string;
}

export interface Photo {
  id: ID;
  /** Remote URL, local file URI, or `placeholder://<species>` for bundled tiles. */
  url: string;
  caption?: string;
}

/** A prompt as defined in config (`src/config/prompts.ts`). */
export interface Prompt {
  id: ID;
  text: string;
  category: 'personal' | 'pet';
}

/** A user's answer to a configured prompt. */
export interface PromptAnswer {
  id: ID;
  promptId: ID;
  answer: string;
}

export interface Pet {
  id: ID;
  ownerId: ID;
  name: string;
  species: Species;
  breed?: string;
  /** Optional: people can leave it out. */
  ageYears?: number;
  /** Dogs only. */
  size?: DogSize;
  energy: EnergyLevel;
  goodWith: { dogs: Tri; cats: Tri; kids: Tri };
  personalityTags: string[];
  photos: Photo[];
}

export interface AnimalLoverProfile {
  lovedSpecies: Species[];
  /** Species of pets they're open to dating someone with. */
  openToPetSpecies: Species[];
}

export interface Basics {
  job?: string;
  hometown?: string;
}

/** What a viewer can set to filter Discover. Any of these can become a dealbreaker. */
export interface Preferences {
  ageRange: { min: number; max: number };
  maxDistanceMiles: number;
  /** Genders the user wants to see. */
  genders: Gender[];
  relationshipGoals: RelationshipGoal[];
  show: 'pet_owners' | 'animal_lovers' | 'both';
  petSpecies: Species[];
  petSizes: DogSize[];
  petEnergy: EnergyLevel[];
}

export interface Dealbreakers {
  age: boolean;
  distance: boolean;
  relationshipGoals: boolean;
  show: boolean;
  petSpecies: boolean;
  petSizes: boolean;
  petEnergy: boolean;
  /** "My pet isn't good with …": skip anyone who has these species. */
  petNotGoodWith: Species[];
  /** Treat my allergies as a hard filter against pets of those species. */
  allergies: boolean;
}

/** Which push notifications the user wants (delivery itself comes later with Expo push). */
export interface NotificationSettings {
  matches: boolean;
  messages: boolean;
  likes: boolean;
  playDates: boolean;
}

export interface User {
  id: ID;
  kind: AccountKind;
  firstName: string;
  birthdate: ISODate;
  gender: Gender;
  interestedIn: Gender[];
  location: Location;
  /** What they're looking for; they can pick several. Empty = not said (neutral when matching). */
  relationshipGoals: RelationshipGoal[];
  basics: Basics;
  photos: Photo[];
  promptAnswers: PromptAnswer[];
  allergies: Species[];
  animalLover?: AnimalLoverProfile;
  preferences: Preferences;
  dealbreakers: Dealbreakers;
  notifications: NotificationSettings;
  paused: boolean;
  onboardingComplete: boolean;
  /** Onboarding step ids completed or skipped, so the flow can resume. */
  onboardingSteps: string[];
  createdAt: ISODate;
  lastActiveAt: ISODate;
}

/** A user together with their pets. The shape the matching logic and UI operate on. */
export interface Profile {
  user: User;
  pets: Pet[];
}

export type LikeTarget =
  { type: 'photo'; id: ID } | { type: 'prompt'; id: ID } | { type: 'pet'; id: ID };

export interface Like {
  id: ID;
  fromUserId: ID;
  toUserId: ID;
  target: LikeTarget;
  comment?: string;
  /** The daily "Treat": surfaces at the top of the recipient's Likes You list. */
  isTreat: boolean;
  createdAt: ISODate;
}

export interface Match {
  id: ID;
  userIds: [ID, ID];
  createdAt: ISODate;
}

export type PlayDateKind = 'dog_park' | 'pet_friendly_cafe' | 'hiking_trail' | 'beach' | 'custom';

export type DatePlanStatus = 'proposed' | 'accepted' | 'declined' | 'change_suggested';

export interface DatePlan {
  id: ID;
  matchId: ID;
  proposerId: ID;
  kind: PlayDateKind;
  customLabel?: string;
  /** Free text: a place name or address the proposer typed. */
  location?: string;
  startsAt: ISODate;
  status: DatePlanStatus;
  note?: string;
  /** Who last answered the plan (accepted, declined or suggested a change). */
  respondedById?: ID;
  createdAt: ISODate;
}

export interface Message {
  id: ID;
  matchId: ID;
  senderId: ID;
  kind: 'text' | 'date_plan';
  text?: string;
  datePlanId?: ID;
  createdAt: ISODate;
  readAt?: ISODate;
}

export type ReportReason =
  | 'fake_profile'
  | 'inappropriate_photos'
  | 'harassment'
  | 'spam'
  | 'underage'
  | 'animal_welfare'
  | 'other';

export interface Report {
  id: ID;
  reporterId: ID;
  reportedId: ID;
  reason: ReportReason;
  details?: string;
  createdAt: ISODate;
}
