/**
 * Prints SQL that applies the seed plan to a database, for supabase/tests/run.sh: it loads the
 * planned rows into the real tables so every check constraint, enum, foreign key and trigger
 * gets a say. Not used against the live project (that goes through the Auth admin API).
 */
import { buildSeed, SEED_VIEWER_ID } from '@/mocks/seed';
import type { Profile } from '@/domain/types';
import { planInteractions } from './interactionPlan';
import { planSeed, type Row } from './seedPlan';

let n = 0;
const newId = () => `00000000-0000-4000-8000-${String(++n).padStart(12, '0')}`;
const now = new Date('2026-10-06T12:00:00Z');
const seed = buildSeed(now);
const plan = planSeed(seed, newId);

const json = (rows: Row[]) => `$j$${JSON.stringify(rows)}$j$::jsonb`;
// Name only the columns the rows carry, so column defaults (created_at, ...) still apply,
// exactly like an insert through the API.
const insert = (table: string, rows: Row[]) => {
  if (!rows.length) return '';
  const cols = Object.keys(rows[0]!).join(', ');
  return `insert into public.${table} (${cols}) select ${cols} from jsonb_populate_recordset(null::public.${table}, ${json(rows)});`;
};

const out: string[] = [];
// Auth users first (a trigger creates each bare profile), then fill the profiles in.
const viewerId = newId();
out.push(
  `insert into auth.users (id, email, raw_app_meta_data) values ${plan.accounts
    .map((a) => `('${a.newId}', '${a.email}', '{"is_seed": true}')`)
    .join(', ')};`,
  `insert into auth.users (id, email) values ('${viewerId}', 'tester@example.com');`,
);
const cols = Object.keys(plan.profiles[0]!).filter((c) => c !== 'id');
out.push(
  `update public.profiles p set ${cols.map((c) => `${c} = r.${c}`).join(', ')}
   from jsonb_populate_recordset(null::public.profiles, ${json(plan.profiles)}) r where p.id = r.id;`,
);
for (const t of ['profile_locations', 'pets', 'photos', 'prompt_answers'] as const) {
  out.push(insert(t, plan[t]));
}

// The tester: the mock demo user, made real.
const demo = seed.users.find((u) => u.id === SEED_VIEWER_ID)!;
const viewer: Profile = {
  user: {
    ...demo,
    id: viewerId,
    photos: demo.photos.map((p) => ({ ...p, id: newId() })),
    promptAnswers: demo.promptAnswers.map((a) => ({ ...a, id: newId() })),
  },
  pets: seed.pets
    .filter((p) => p.ownerId === SEED_VIEWER_ID)
    .map((p) => ({ ...p, id: newId(), ownerId: viewerId })),
};
out.push(
  `update public.profiles set onboarding_complete = true where id = '${viewerId}';`,
  `insert into public.profile_locations (user_id, lat, lng) values ('${viewerId}', ${demo.location.lat}, ${demo.location.lng});`,
);
const pool: Profile[] = seed.users
  .filter((u) => u.id !== SEED_VIEWER_ID)
  .map((user) => ({
    user: { ...user, id: plan.idMap.get(user.id)! },
    pets: seed.pets.filter((p) => p.ownerId === user.id),
  }));
const inter = planInteractions(viewer, pool, now, newId);
out.push(
  insert('likes', inter.likes),
  insert('matches', inter.matches),
  insert('messages', inter.messages),
);

// What the checks below look at.
out.push(
  `do $$ begin
     raise notice 'SEEDCHECK profiles=% seed=% pets=% photos=% prompts=% locations=% likes=% matches=% messages=%',
       (select count(*) from public.profiles), (select count(*) from public.profiles where is_seed),
       (select count(*) from public.pets), (select count(*) from public.photos),
       (select count(*) from public.prompt_answers), (select count(*) from public.profile_locations),
       (select count(*) from public.likes), (select count(*) from public.matches),
       (select count(*) from public.messages);
   end $$;`,
  `do $$ begin
     raise notice 'SEEDCHECK discoverable_for_tester=%',
       (select count(*) from public.profiles p join public.profile_locations l on l.user_id = p.id
         where p.is_seed and p.onboarding_complete and not p.paused);
   end $$;`,
);
console.log(out.join('\n'));
