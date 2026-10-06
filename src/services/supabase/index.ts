import type { Services } from '../types';
import { createSupabaseAuth } from './auth';
import { getSupabase } from './client';
import { createSupabaseMedia } from './media';
import { createSupabasePets } from './pets';
import { createSupabaseUsers } from './users';

/** Placeholder for services that aren't built yet: fails loudly instead of silently mocking. */
function notReady<T extends object>(name: string): T {
  return new Proxy({} as T, {
    get: (_t, prop) => () => {
      throw new Error(`Supabase ${name}.${String(prop)} is not built yet.`);
    },
  });
}

/**
 * Real services. Built one at a time: auth, users/pets/media done; discovery, likes, matches
 * and chat still to come.
 * Until all exist, keep EXPO_PUBLIC_USE_MOCKS=true for normal use.
 */
export function createSupabaseServices(): Services {
  const supabase = getSupabase();
  return {
    auth: createSupabaseAuth(supabase),
    users: createSupabaseUsers(supabase),
    pets: createSupabasePets(supabase),
    discovery: notReady('discovery'),
    likes: notReady('likes'),
    matches: notReady('matches'),
    chat: notReady('chat'),
    media: createSupabaseMedia(supabase),
  };
}
