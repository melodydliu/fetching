/**
 * Deletes every seeded test account (and, by cascade, their pets, photos, likes, matches and
 * messages). Safe by construction: an account is only deleted if ALL of these hold:
 *   - its profile has is_seed = true,
 *   - its auth app_metadata says is_seed (only the secret key can set that),
 *   - its email ends with @seed.fetching.test.
 * Real people can never match all three. It lists what it would do and only deletes with --yes.
 *
 *   SUPABASE_SECRET_KEY=sb_secret_xxx npm run seed:clean            # dry run
 *   SUPABASE_SECRET_KEY=sb_secret_xxx npm run seed:clean -- --yes   # really delete
 */
import { cleanSeed } from './cleanSeed';
import { loadEnv, parseArgs } from './lib';

loadEnv();
const { flags } = parseArgs(process.argv.slice(2));
cleanSeed({ yes: flags.has('yes') }).catch((e: Error) => {
  console.error(e.message);
  process.exit(1);
});
