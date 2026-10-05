import type { ID, Profile } from '../types';

export type CompatibilityLabel = 'great' | 'good' | 'okay' | 'caution';

export interface CompatibilityReason {
  text: string;
  tone: 'positive' | 'caution';
}

/** Pet compatibility between two profiles, with human-readable reasons for the UI badge. */
export interface Compatibility {
  /** 0–100. */
  score: number;
  label: CompatibilityLabel;
  reasons: CompatibilityReason[];
  /** False when there was nothing to compare, so the UI should hide the badge. */
  informative: boolean;
}

export interface LikedYou {
  isTreat: boolean;
}

export interface RankedCandidate {
  profile: Profile;
  distanceMiles: number;
  compatibility: Compatibility;
  rank: number;
  likedYou: LikedYou | null;
}

export interface FeedContext {
  now: Date;
  /** Blocked either way, already liked, passed, or matched. */
  excludedIds: ReadonlySet<ID>;
  /** People who already liked the viewer. */
  incomingLikes: ReadonlyMap<ID, LikedYou>;
}
