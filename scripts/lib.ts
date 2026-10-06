/** Shared bits for the seed / cleanup scripts (run with tsx on your own machine). */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export function loadEnv(): void {
  try {
    (process as unknown as { loadEnvFile: (p: string) => void }).loadEnvFile('.env.local');
  } catch {
    // .env.local is optional: variables can come from the shell instead.
  }
}

export function parseArgs(argv: string[]): { flags: Set<string>; values: Map<string, string> } {
  const flags = new Set<string>();
  const values = new Map<string, string>();
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]!;
    if (!arg.startsWith('--')) continue;
    const next = argv[i + 1];
    if (next && !next.startsWith('--')) {
      values.set(arg.slice(2), next);
      i++;
    } else {
      flags.add(arg.slice(2));
    }
  }
  return { flags, values };
}

/**
 * An admin client. Needs the project's SECRET key (Dashboard -> Project Settings -> API Keys),
 * which bypasses all security rules, so it is read only from the environment of the command you
 * run: never from a file in the repo, never in the app.
 */
export function adminClient(): SupabaseClient {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url) fail('EXPO_PUBLIC_SUPABASE_URL is not set (it lives in .env.local).');
  if (!key) {
    fail(
      [
        'This needs your Supabase SECRET key, passed for this one command only:',
        '',
        '  SUPABASE_SECRET_KEY=sb_secret_xxx npm run <script> -- <options>',
        '',
        'Find it in the dashboard under Project Settings -> API Keys ("Secret keys").',
        'It bypasses every security rule: do not paste it into a file, the app, or a chat.',
      ].join('\n'),
    );
  }
  return createClient(url!, key!, { auth: { persistSession: false, autoRefreshToken: false } });
}

export function fail(message: string): never {
  console.error(`\n${message}\n`);
  process.exit(1);
  throw new Error(message); // unreachable; satisfies `never`
}

/** Find an auth user by email (the admin API has no direct lookup). */
export async function findUserByEmail(supabase: SupabaseClient, email: string) {
  const wanted = email.trim().toLowerCase();
  for (let page = 1; page <= 50; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw new Error(error.message);
    const hit = data.users.find((u) => u.email?.toLowerCase() === wanted);
    if (hit) return hit;
    if (data.users.length < 200) return null;
  }
  return null;
}
