import type { SupabaseClient } from '@supabase/supabase-js';
import type { Services } from '../types';
import { createSupabaseAuth } from './auth';
import { getSupabase } from './client';
import { createSupabaseChat } from './chat';
import { createSupabaseDiscovery } from './discovery';
import { createSupabaseLikes } from './likes';
import { createSupabaseMatches } from './matches';
import { createSupabaseMedia } from './media';
import { createSupabasePets } from './pets';
import { createSupabaseUsers } from './users';

/**
 * The real (Supabase) implementation of every service. Same interfaces as the mock, so no
 * screen changes when `EXPO_PUBLIC_USE_MOCKS=false`.
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
    chat: createSupabaseChat(supabase),
    media: createSupabaseMedia(supabase),
  };
}
