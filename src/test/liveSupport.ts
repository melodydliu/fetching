/** Shared setup for the live (real project) integration tests. Not a test file itself. */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { config } from '@/config';
import { defaultPreferences } from '@/domain/defaults';
import type { Gender } from '@/domain/types';
import { newId } from '@/utils/id';
import { createSupabaseServices } from '@/services/supabase';
import type { Services } from '@/services/types';

export const LIVE = process.env.RUN_LIVE_TESTS === '1';
export const PHOTO_URI = 'file:///sample/photo.png';

// 1x1 transparent PNG.
const PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';

/**
 * Jest's Expo preset stubs out `fetch`, so install a real one (node-fetch) when running live.
 * node-fetch can't read local files, so PHOTO_URI (like a phone's file:// URI) is answered
 * with a tiny PNG instead.
 */
export function installLiveFetch(): void {
  if (!LIVE) return;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const nodeFetch = require('node-fetch') as typeof fetch;
  globalThis.fetch = ((input: Parameters<typeof fetch>[0], init?: RequestInit) => {
    if (input === PHOTO_URI) {
      const bytes = Uint8Array.from(atob(PNG_BASE64), (c) => c.charCodeAt(0));
      return Promise.resolve({ arrayBuffer: async () => bytes.buffer } as Response);
    }
    return nodeFetch(input, init);
  }) as typeof fetch;
}

export interface LiveUser {
  id: string;
  services: Services;
  client: SupabaseClient;
}

/** A brand-new account with its own client/session, so several people can act in one test. */
export async function signUpLiveUser(
  label: string,
  password = 'correct-horse-9',
): Promise<LiveUser> {
  const client = createClient(config.supabaseUrl, config.supabaseKey, {
    auth: { persistSession: false },
  });
  const services = createSupabaseServices(client);
  const email = `live-${label}-${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.com`;
  const { userId } = await services.auth.signUp({ email, password });
  return { id: userId, services, client };
}

export const SF = { city: 'San Francisco', lat: 37.7749, lng: -122.4194 };
export const OAKLAND = { city: 'Oakland', lat: 37.8044, lng: -122.2712 }; // ~8.4 miles from SF

/** Complete a throwaway profile so the person is visible in Discover. */
export async function finishLiveProfile(
  u: LiveUser,
  name: string,
  gender: Gender,
  interestedIn: Gender[],
  location: typeof SF,
): Promise<void> {
  await u.services.users.update(u.id, {
    firstName: name,
    birthdate: '1995-05-05',
    gender,
    interestedIn,
    location,
    preferences: defaultPreferences(31, interestedIn),
    photos: [0, 1, 2].map((i) => ({ id: newId('ph'), url: `https://example.com/${name}${i}.jpg` })),
    onboardingComplete: true,
  });
}

/** Two people like each other, so they are matched. Returns the match. */
export async function matchLiveUsers(a: LiveUser, b: LiveUser) {
  const photoOf = async (u: LiveUser) => (await u.services.users.getById(u.id))!.photos[0]!;
  await a.services.likes.send({
    fromUserId: a.id,
    toUserId: b.id,
    target: { type: 'photo', id: (await photoOf(b)).id },
  });
  const { match } = await b.services.likes.send({
    fromUserId: b.id,
    toUserId: a.id,
    target: { type: 'photo', id: (await photoOf(a)).id },
  });
  if (!match) throw new Error('expected a match');
  return match;
}

/** Resolves with the first value `register` hands to its callback, or rejects after `ms`. */
export function nextEvent<T>(
  register: (cb: (value: T) => void) => () => void,
  ms = 10_000,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const off = register((value) => {
      clearTimeout(timer);
      off();
      resolve(value);
    });
    const timer = setTimeout(() => {
      off();
      reject(new Error(`no event within ${ms}ms`));
    }, ms);
  });
}

/** Close realtime sockets (so Jest can exit), then delete each throwaway account and its files. */
export async function cleanupLiveUsers(...users: (LiveUser | undefined)[]): Promise<void> {
  await Promise.allSettled(
    users.map(async (u) => {
      if (!u) return;
      await u.client.removeAllChannels();
      await u.services.auth.deleteAccount();
    }),
  );
}
