/** Shared setup for the live (real project) integration tests. Not a test file itself. */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { config } from '@/config';
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
