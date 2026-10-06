import type { SupabaseClient } from '@supabase/supabase-js';
import type { Services } from '../types';
import { createSupabaseAuth } from './auth';
import { getSupabase } from './client';
import { createSupabaseDiscovery } from './discovery';
import { createSupabaseLikes } from './likes';
import { createSupabaseMatches } from './matches';
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
 * Real services. Built one at a time: auth, users, pets, media, discovery, likes and matches
 * are done; chat is still to come.
 * Until all exist, keep EXPO_PUBLIC_USE_MOCKS=true for normal use.
 */
export function createSupabaseServices(supabase: SupabaseClient = getSupabase()): Services {
  const users = createSupabaseUsers(supabase);
  return {
    auth: createSupabaseAuth(supabase),
    users,
    pets: createSupabasePets(supabase),
    discovery: createSupabaseDiscovery(supabase, users),
    likes: createSupabaseLikes(supabase),
    matches: createSupabaseMatches(supabase),
    chat: notReady('chat'),
    media: createSupabaseMedia(supabase),
  };
}
