/**
 * Fills the REAL database with believable test people (the same 44 as the mock world), so a
 * real-mode Discover isn't empty. Every account is tagged as seed data and can be removed with
 * `npm run seed:clean`.
 *
 *   npm run seed -- --dry-run                      # show the plan; needs no key
 *   SUPABASE_SECRET_KEY=sb_secret_xxx npm run seed -- --for you@example.com
 *
 * Options
 *   --for <email>     also give THAT real account incoming likes (one Treat) and a few matches
 *                     with conversation, and centre the test people around their saved location
 *   --center <lat,lng,City>   centre the test people somewhere specific instead
 *   --reset           remove existing seed data first
 *   --dry-run         plan only: change nothing, no key needed
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Profile } from '@/domain/types';
import { buildSeed } from '@/mocks/seed';
import { cleanSeed } from './cleanSeed';
import { planInteractions } from './interactionPlan';
import { planSeed, seedPeople } from './seedPlan';
import { adminClient, fail, findUserByEmail, loadEnv, parseArgs } from './lib';

const CHUNK = 200;
const randomUUID = () => crypto.randomUUID();

async function insertRows(
  supabase: SupabaseClient,
  table: string,
  rows: Record<string, unknown>[],
) {
  for (let i = 0; i < rows.length; i += CHUNK) {
    const { error } = await supabase.from(table).insert(rows.slice(i, i + CHUNK));
    if (error) throw new Error(`${table}: ${error.message}`);
  }
}

async function main() {
  loadEnv();
  const { flags, values } = parseArgs(process.argv.slice(2));
  const dryRun = flags.has('dry-run');
  const forEmail = values.get('for');
  const centerArg = values.get('center');

  const supabase = dryRun ? null : adminClient();

  // Existing seed data?
  if (supabase) {
    const { count } = await supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('is_seed', true);
    if (count) {
      if (!flags.has('reset')) {
        fail(
          `${count} seed accounts already exist. Run "npm run seed:clean -- --yes" first, or add --reset.`,
        );
      }
      console.log('Removing existing seed data first...');
      await cleanSeed({ yes: true });
    }
  }

  // Who are we seeding for, and where is the centre?
  let viewer: Profile | null = null;
  let center = { lat: 37.7749, lng: -122.4194, city: 'San Francisco' };
  if (centerArg) {
    const [lat, lng, ...city] = centerArg.split(',');
    if (!Number.isFinite(Number(lat)) || !Number.isFinite(Number(lng))) {
      fail('--center must look like: 37.77,-122.42,San Francisco');
    }
    center = { lat: Number(lat), lng: Number(lng), city: city.join(',').trim() || 'Seed city' };
  }
  if (forEmail && supabase) {
    const { PROFILE_SELECT, PET_SELECT, petFromRow, userFromRow } =
      await import('@/services/supabase/mappers');
    const account = await findUserByEmail(supabase, forEmail);
    if (!account) fail(`No account for ${forEmail}. Sign up in the app first.`);
    const { data: row, error } = await supabase
      .from('profiles')
      .select(PROFILE_SELECT)
      .eq('id', account!.id)
      .single();
    if (error) throw new Error(error.message);
    const { data: loc } = await supabase
      .from('profile_locations')
      .select('lat, lng')
      .eq('user_id', account!.id)
      .maybeSingle();
    if (!loc) {
      fail(
        `${forEmail} has no saved location yet. Finish onboarding in the app first (location step), then re-run.`,
      );
    }
    const { data: petRows } = await supabase
      .from('pets')
      .select(PET_SELECT)
      .eq('owner_id', account!.id);
    viewer = {
      user: userFromRow(row as never, { lat: loc!.lat, lng: loc!.lng }),
      pets: (petRows ?? []).map((p) => petFromRow(p as never)),
    };
    if (!centerArg)
      center = { lat: loc!.lat, lng: loc!.lng, city: viewer.user.location.city || 'Your city' };
  }

  const seed = buildSeed(new Date(), center);
  const people = seedPeople(seed);
  console.log(
    `Seeding ${people.length} people around ${center.city} (${center.lat}, ${center.lng}).`,
  );

  if (dryRun || !supabase) {
    const plan = planSeed(seed, randomUUID);
    console.log(
      `Dry run. Would create ${plan.accounts.length} accounts, ${plan.pets.length} pets, ` +
        `${plan.photos.length} photos, ${plan.prompt_answers.length} prompt answers.` +
        (forEmail ? ` Would also add likes and matches for ${forEmail}.` : ''),
    );
    return;
  }

  // 1. Accounts (the database creates each bare profile by itself).
  console.log('Creating accounts...');
  const plannedEmails = planSeed(seed, randomUUID).accounts.map((a) => a.email);
  const userIds: string[] = [];
  for (const email of plannedEmails) {
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password: randomUUID(), // nobody logs in as a seed person
      email_confirm: true,
      app_metadata: { is_seed: true }, // only the secret key can set this
    });
    if (error || !data.user) throw new Error(`create ${email}: ${error?.message}`);
    userIds.push(data.user.id);
  }

  // 2. Their profiles, pets, photos and prompts.
  console.log('Writing profiles...');
  const plan = planSeed(seed, randomUUID, userIds);
  {
    const { error } = await supabase.from('profiles').upsert(plan.profiles, { onConflict: 'id' });
    if (error) throw new Error(`profiles: ${error.message}`);
  }
  await insertRows(supabase, 'profile_locations', plan.profile_locations);
  await insertRows(supabase, 'pets', plan.pets);
  await insertRows(supabase, 'photos', plan.photos);
  await insertRows(supabase, 'prompt_answers', plan.prompt_answers);

  // 3. Likes and matches for the real tester.
  if (viewer) {
    console.log(`Adding likes and matches for ${forEmail}...`);
    const pool: Profile[] = people.map((user) => ({
      user: { ...user, id: plan.idMap.get(user.id)! },
      pets: seed.pets.filter((p) => p.ownerId === user.id),
    }));
    const interactions = planInteractions(viewer, pool, new Date(), randomUUID);
    await insertRows(supabase, 'likes', interactions.likes);
    await insertRows(supabase, 'matches', interactions.matches);
    await insertRows(supabase, 'messages', interactions.messages);
    console.log(`  liked you: ${interactions.summary.likedBy.join(', ') || '(nobody eligible)'}`);
    console.log(
      `  matched:   ${interactions.summary.matchedWith.join(', ') || '(nobody eligible)'}`,
    );
  }

  console.log(
    '\nDone. Remove it all later with: SUPABASE_SECRET_KEY=... npm run seed:clean -- --yes',
  );
}

main().catch((e: Error) => {
  console.error(`\nSeeding stopped: ${e.message}`);
  console.error('Anything already created is tagged: "npm run seed:clean -- --yes" removes it.');
  process.exit(1);
});
