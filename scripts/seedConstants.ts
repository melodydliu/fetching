/** Constants shared by the seed and cleanup scripts. No imports, so nothing else gets loaded. */

/** Reserved, never-deliverable domain: seed accounts can't be mistaken for real people. */
export const SEED_EMAIL_DOMAIN = 'seed.fetching.test';
export const seedEmail = (n: number) => `seed-${n}@${SEED_EMAIL_DOMAIN}`;
