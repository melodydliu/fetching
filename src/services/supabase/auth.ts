import type { SupabaseClient } from '@supabase/supabase-js';
import type { AuthService } from '../types';

const PHOTO_BUCKET = 'photos';

/** Turn Supabase's wording into something we'd say to a person. */
function friendly(message: string): string {
  const m = message.toLowerCase();
  if (m.includes('invalid login credentials')) {
    return "That email and password don't match an account. Check them, or create an account instead.";
  }
  if (m.includes('already registered') || m.includes('already been registered')) {
    return 'An account already exists for that email. Try logging in.';
  }
  if (m.includes('password') && m.includes('characters')) {
    return 'Choose a longer password.';
  }
  if (m.includes('rate limit') || m.includes('too many')) {
    return 'Too many attempts. Wait a minute and try again.';
  }
  if (m.includes('network') || m.includes('fetch')) {
    return "Couldn't reach the server. Check your connection and try again.";
  }
  return message;
}

export function createSupabaseAuth(supabase: SupabaseClient): AuthService {
  return {
    async getSession() {
      const { data } = await supabase.auth.getSession();
      return data.session ? { userId: data.session.user.id } : null;
    },

    async signIn({ email, password }) {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error || !data.session) throw new Error(friendly(error?.message ?? 'Could not log in'));
      return { userId: data.session.user.id };
    },

    // The database creates the bare profile row by itself (trigger on auth.users).
    async signUp({ email, password }) {
      const { data, error } = await supabase.auth.signUp({ email: email.trim(), password });
      if (error) throw new Error(friendly(error.message));
      if (!data.session) {
        // Only happens if email confirmation is switched on for the project.
        throw new Error('Check your email to confirm your address, then log in.');
      }
      return { userId: data.session.user.id };
    },

    async signOut() {
      const { error } = await supabase.auth.signOut();
      if (error) throw new Error(friendly(error.message));
    },

    async getAccount() {
      const { data } = await supabase.auth.getUser();
      const user = data.user;
      if (!user) return null;
      return {
        method: 'email' as const,
        identifier: user.email ?? '',
        createdAt: user.created_at,
      };
    },

    async deleteAccount() {
      const { data } = await supabase.auth.getUser();
      const userId = data.user?.id;
      if (!userId) return;
      // Remove their uploaded photo files first; deleting the account can't reach Storage.
      const { data: files } = await supabase.storage
        .from(PHOTO_BUCKET)
        .list(userId, { limit: 1000 });
      if (files?.length) {
        await supabase.storage.from(PHOTO_BUCKET).remove(files.map((f) => `${userId}/${f.name}`));
      }
      const { error } = await supabase.rpc('delete_my_account');
      if (error) throw new Error(friendly(error.message));
      // The user no longer exists server-side, so just clear this device's session.
      await supabase.auth.signOut({ scope: 'local' });
    },
  };
}
