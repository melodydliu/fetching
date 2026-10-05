import type { Profile, User } from '@/domain/types';

export type UserPatch = Partial<Omit<User, 'id'>>;

export interface StepProps {
  profile: Profile;
  progress: number;
  onBack?: () => void;
  /** Finish this step, optionally saving fields, and move on. */
  onContinue: (patch?: UserPatch) => void;
  /** Present only for optional steps. */
  onSkip?: () => void;
}
