/** Deletes seeded test accounts safely. See seed-clean.ts for the command and the safety rules. */
import { adminClient } from './lib';
import { SEED_EMAIL_DOMAIN } from './seedConstants';

export async function cleanSeed(opts: { yes: boolean }): Promise<number> {
  const supabase = adminClient();
  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('id')
    .eq('is_seed', true);
  if (error) throw new Error(error.message);
  const ids = new Set((profiles ?? []).map((p) => p.id as string));

  const doomed: { id: string; email: string }[] = [];
  const skipped: string[] = [];
  for (let page = 1; page <= 50; page++) {
    const { data, error: listError } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
    if (listError) throw new Error(listError.message);
    for (const u of data.users) {
      if (!ids.has(u.id)) continue;
      const tagged = u.app_metadata?.is_seed === true;
      const reserved = (u.email ?? '').toLowerCase().endsWith(`@${SEED_EMAIL_DOMAIN}`);
      if (tagged && reserved) doomed.push({ id: u.id, email: u.email! });
      else
        skipped.push(
          `${u.email ?? u.id} (flagged as seed but failed a safety check: NOT deleting)`,
        );
    }
    if (data.users.length < 200) break;
  }

  console.log(`Seed accounts found: ${doomed.length}`);
  skipped.forEach((s) => console.warn(`  skipped: ${s}`));
  if (!opts.yes) {
    console.log('Dry run: nothing deleted. Re-run with --yes to delete them.');
    return 0;
  }
  let deleted = 0;
  for (const u of doomed) {
    const { error: delError } = await supabase.auth.admin.deleteUser(u.id);
    if (delError) console.error(`  could not delete ${u.email}: ${delError.message}`);
    else deleted++;
  }
  console.log(`Deleted ${deleted} of ${doomed.length} seed accounts.`);
  return deleted;
}
