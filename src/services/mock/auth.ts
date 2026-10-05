import { config } from '@/config';
import { defaultDealbreakers, defaultPreferences } from '@/domain/defaults';
import type { User } from '@/domain/types';
import type { AuthService } from '../types';
import { credentialKey, MockDb, simulate } from './db';

export function createMockAuth(db: MockDb): AuthService {
  return {
    getSession: () => simulate(() => (db.sessionUserId ? { userId: db.sessionUserId } : null)),
    // Any credentials work in mock mode; we sign in as the seeded viewer (or the dev-switched user).
    signIn: (credentials) =>
      simulate(() => {
        const userId = db.accounts.get(credentialKey(credentials));
        if (!userId || !db.users.has(userId)) {
          throw new Error('No account found for that phone or email. Try creating one instead.');
        }
        db.sessionUserId = userId;
        return { userId };
      }),
    signUp: (credentials) =>
      simulate(() => {
        const key = credentialKey(credentials);
        if (db.accounts.has(key)) {
          throw new Error('An account already exists for that phone or email. Try logging in.');
        }
        const now = new Date().toISOString();
        const user: User = {
          id: db.nextId('u'),
          kind: 'pet_owner',
          firstName: '',
          birthdate: '',
          gender: 'woman',
          interestedIn: [],
          relationshipGoals: [],
          location: { ...config.mockCenter },
          basics: {},
          photos: [],
          promptAnswers: [],
          allergies: [],
          preferences: defaultPreferences(30, []),
          dealbreakers: defaultDealbreakers(),
          paused: false,
          onboardingComplete: false,
          onboardingSteps: [],
          createdAt: now,
          lastActiveAt: now,
        };
        db.users.set(user.id, user);
        db.accounts.set(key, user.id);
        db.sessionUserId = user.id;
        return { userId: user.id };
      }),
    signOut: () =>
      simulate(() => {
        db.sessionUserId = null;
      }),
    deleteAccount: () =>
      simulate(() => {
        const id = db.sessionUserId;
        if (id) {
          db.users.delete(id);
          for (const [key, owner] of db.accounts) if (owner === id) db.accounts.delete(key);
          for (const pet of [...db.pets.values()]) if (pet.ownerId === id) db.pets.delete(pet.id);
          db.matches = db.matches.filter((m) => !m.userIds.includes(id));
          db.likes = db.likes.filter((l) => l.fromUserId !== id && l.toUserId !== id);
        }
        db.sessionUserId = null;
      }),
  };
}
