import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';
import 'react-native-url-polyfill/auto';
import { config } from '@/config';

let client: SupabaseClient | null = null;

/** One shared client. Only the publishable key lives in the app; row-level security does the rest. */
export function getSupabase(): SupabaseClient {
  if (client) return client;
  if (!config.supabaseUrl || !config.supabaseKey) {
    throw new Error(
      'Supabase is not configured. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_KEY in .env.local.',
    );
  }
  const supabase = createClient(config.supabaseUrl, config.supabaseKey, {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  });
  // Only refresh tokens while the app is in the foreground (saves battery and requests).
  if (Platform.OS !== 'web') {
    AppState.addEventListener('change', (state) => {
      if (state === 'active') void supabase.auth.startAutoRefresh();
      else void supabase.auth.stopAutoRefresh();
    });
  }
  client = supabase;
  return supabase;
}
