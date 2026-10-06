# Fetching: dating app for pet lovers

Expo SDK 57 + React Native + TypeScript (strict). iOS and Android; Expo Go for dev.
Everything runs on **mock services** for now (`EXPO_PUBLIC_USE_MOCKS=true`, the default).

## Commands
```bash
npm start            # expo start (scan QR with Expo Go)
npm test             # jest (jest-expo, watchman disabled on purpose)
npm run typecheck    # tsc --noEmit
npm run lint         # expo lint (ESLint + Prettier)
npm run format       # prettier --write src
npx expo install <pkg>   # ALWAYS use for deps (resolves SDK-compatible versions)
```
Run `typecheck`, `lint` and `test` before calling any task done.
Expo changes a lot between SDKs: check https://docs.expo.dev/llms.txt before using an Expo API from memory.

## Architecture
```
src/app/            Expo Router routes only. (tabs)/ = Discover, Likes You, Matches, Profile.
                    Headless tabs (expo-router/ui) with a custom floating bar.
src/domain/         Pure TS: types.ts (all models), geo.ts, and (Phase 2) matching/. NO UI or service imports.
src/services/       types.ts = interfaces (the only thing UI imports). index.tsx = provider + switch.
src/services/mock/  In-memory implementations over MockDb, with 200-500ms simulated latency.
src/mocks/          Seed generator (deterministic), prompt answers, image URL pools.
src/config/         index.ts (all knobs), prompts.ts (30 prompts), reference.ts (breeds, labels).
src/theme/          Colors (light + dark), type scale, spacing, radii. The ONLY place for style tokens.
src/components/ui/  Primitives (Text, Button, Screen, ListRow, Skeleton, EmptyState...).
src/hooks/          useTheme, queries.ts (TanStack Query hooks + query keys).
src/state/          Zustand: devStore (forced empty states), toastStore.
```

## Conventions
- **UI never imports `services/mock`**. Use `useServices()`. Swapping in Supabase = add `createSupabaseServices()` in `src/services/index.tsx`.
- Server data goes through TanStack Query (`hooks/queries.ts`); Zustand is for client-only state.
- Mock services return deep copies (`simulate()`); never return live db objects.
- Matching/compatibility = pure functions in `src/domain/matching`, unit-tested. Weights in one config object. Unknown/"unsure" is neutral, never a penalty.
- Style via `useTheme()` tokens. No hard-coded colors or font names in screens. Support dark mode.
- Every list screen needs real loading (Skeleton), empty (EmptyState) and error (ErrorState) states.
- Accessibility: pressables get `accessibilityRole` + label, tap targets >= 48pt, decorative SVGs `aria-hidden`.
- Haptics on like/match (`expo-haptics`; Button does a light tap by default).
- Path alias `@/` -> `src/`. Prettier: single quotes, 100 cols.

## Onboarding & profile (Phase 1)
- Flow rules are pure and tested in `src/domain/onboarding.ts` (step order per user type, 18+ birthday validation, completeness). UI in `src/features/onboarding/`.
- `signUp` creates a bare account (`onboardingComplete: false`). Each finished/skipped step is appended to `user.onboardingSteps`, so relaunching resumes in place. `Stack.Protected` in `app/_layout.tsx` routes signed-out / onboarding / ready.
- A pet's breed and age are optional (`Pet.ageYears?`, `pets.age_years` nullable); a dog still needs a size. The profile card just omits what's missing.
- Pet form = 4 sections (`components/pets/PetSections.tsx`): one per onboarding screen, all stacked in `app/pet/[id].tsx`.
- Profile writes go through `useProfileActions()`: optimistic cache update, background persist, toast + refetch on failure.
- `PhotoGrid` does long-press drag-reorder (gesture-handler + reanimated) and exposes Move earlier/later/Remove as a11y actions. Use `.get()`/`.set()` on shared values (React Compiler lint).
- `buildProfileBlocks()` orders a profile (photo, prompt, photo, pet...). Discover will reuse it in Phase 2.
- While mocks are on, "Use my location" keeps the real city name but uses `config.mockCenter` coordinates so Discover isn't empty.

## Matching (Phase 2)
All in `src/domain/matching/` (pure, no UI or services). Every weight lives in `MATCHING_CONFIG` (`config.ts`).
- `filters.ts` hard filters: self/excluded/paused/incomplete, mutual orientation, age BOTH ways, distance BOTH ways, then dealbreakers from EITHER user.
- `preferences.ts`: a preference is only a hard rule when its dealbreaker flag is on; otherwise it feeds a soft score. Age and distance are always hard.
- `petCompatibility.ts`: components (species cross-compat, allergies, energy, dog size, animal-lover prefs) -> weighted average of the ones that APPLY, plus caps for real conflicts. Returns `{score, label, reasons[], informative}`. **Internal only: the score and reasons are NOT shown to users** (product decision after Phase 2 review); they feed ranking, and `Candidate.compatibility` is kept for future use.
- `ranking.ts` + `feed.ts`: blend of pet score, goals, distance, completeness, recency, soft prefs; + boost if they already liked the viewer (bigger for a Treat).
- **Unknown / "unsure" is neutral everywhere**: skipped, never scored low, never a dealbreaker hit.
- `MockDb`/`discovery.ts` just call `buildFeed`. Seeded Likes You/Matches are drawn only from people who pass the viewer's hard filters.
- Likes You is a 2-column grid of portrait `LikeCard`s (photo, name/age, what they liked, comment, Treat = coral border + apricot badge); Matches stays a list of rows so the two tabs look different.
- Likes: `LikeRepository.send` enforces daily limit + one Treat/day + no duplicate likes; Dev Menu -> Daily limits overrides quota for testing.
- Profile layout (`ProfileView`): full-bleed hero photo (+ pet photo bubbles bottom-right), then name/age, a facts grid (pets summary, job, city, goal, distance), then photos/prompts/pets. Skip and Like are a floating pair in Discover (`app/(tabs)/index.tsx`); the Like opens the sheet for the hero photo. Each photo/prompt/pet still has its own icon-only heart. Render it edge to edge (no parent padding).
- Profile content: `user.relationshipGoals` is multi-select (empty = unknown/neutral; any overlap counts in matching). Prompts: 1-10 (`config.minPromptAnswers`/`maxPromptAnswers`). Person photos can carry a caption (`PhotoGrid captions`, `CaptionModal`); pet photos don't yet.
- New accounts start on default preferences (age = yours -8/+10, 25 miles); the Preferences screen (Phase 4) edits them.

## Chat & Play Date (Phase 3)
- Routes: `user/[id]` (any profile; `?likeId=` adds the Like back / Remove bar), `chat/[matchId]`, `play-date/[matchId]` (modal), `match-moment` (full-screen modal, `?matchId=`).
- `likes.likeBack(likeId, viewerId)` matches without spending a daily like. Mutual likes sent from Discover also go to the match moment.
- Chat uses TanStack Query for messages; `chat.subscribe` pushes new ones into the cache (dedupe by id). Opening a chat marks it read. Typing: `chat.setTyping` (throttled, best effort, cleared on send/idle/leave) and `chat.subscribeTyping` (replays current state; the screen also auto-hides it after 8s); Dev Menu → "They're typing (15s)".
- Date plan rules are pure (`domain/datePlans.ts`): `DatePlan.respondedById` records who last answered; a suggested change waits on the *other* person. Only the proposer can edit (future dates only; resets to `proposed`) or delete (`/play-date/[matchId]?planId=` is the edit mode of the planner). Day/time picking uses plain chips (`components/chat/DateTimePicker.tsx`), no native picker dependency.

## Pets decide the profile type
- No account-type switch: `user.kind` is derived from pets. `useProfileActions().createPet/removePet` call `kindPatchForPets` so adding a first pet makes someone a pet owner and removing the last makes them an animal lover (`domain/accountKind.ts`). Animal lovers can add pets from Edit profile at any time.

## Preferences & safety (Phase 4)
- Screens that edit data use a **draft + Save changes** bar (`components/SaveBar.tsx`) and `hooks/useDiscardGuard.ts` (asks before leaving with unsaved edits): Edit profile, Preferences, Pet editor. Pure draft rules live in `domain/profileDraft.ts` / `domain/preferencesDraft.ts`.
- Age, distance and the **gender preference** are always hard filters, so they have no dealbreaker switch; a dealbreaker with nothing selected is switched off on save (`normalizeDraft`).
- Safety: `SafetySheet` + `useSafetyActions` (reads the viewer id when the action fires). Blocking removes match + messages; `['candidates'|'likes'|'matches'|'messages'|'blocked']` queries are invalidated.
- `Alert.alert` is a no-op on web: always use `utils/confirm.ts` (`confirmAction`).
- Web quirk: the expo-router tab slot grows to fit content, so a screen with something pinned to the bottom (Discover's Skip/Like) caps its own height on web.
- Component tests: `src/test/render.tsx` (`renderWithApp`, mock services, fresh query cache); Reanimated/worklets are mocked in `jest.setup.ts`. RNTL v14 is async: `await render/fireEvent`.

## Supabase (in progress)
- Sign-in is **email + password** (`SignInCredentials`), in mock and real mode. The mock accepts any password. Real auth lives in `src/services/supabase/auth.ts`; the client is `getSupabase()` (one instance, AsyncStorage session). "Confirm email" is OFF in the dashboard for development only: turn it on with custom SMTP before launch. `@supabase/supabase-js` is pinned to an exact version on purpose.
- `createSupabaseServices(client?)` implements every service. Keep `EXPO_PUBLIC_USE_MOCKS=true` until the seed script exists and a device pass is done (a fresh real database has no other users to show).
- Chat: messages stream via Realtime `postgres_changes` (RLS applies); `chat.subscribe`'s optional `onReady` fires when live and the chat screen refetches then, so nothing sent while connecting is missed. Typing = Realtime Broadcast on private channel `typing:<match id>`, authorized by policies on `realtime.messages` (only the two people in the match); channels must be opened with `{ private: true }`. A new Play Date row makes its chat card by trigger.
- Discover on the real backend: `discovery_distances()` (SECURITY DEFINER, rounded-up whole miles, only people in range of BOTH users, never coordinates) -> profiles + pets -> the same pure `buildFeed`, which accepts `ctx.distances` (when given, unmeasured people are skipped; mock mode omits it and uses coordinates). Likes/matches rules (quotas, match-on-mutual-like, like back, block) are in the database; the Matches list reads the `match_summaries` view (security invoker).
- Row <-> domain mapping is pure and unit-tested in `src/services/supabase/mappers.ts`. `users.update`/`pets.update` also sync the `photos` and `prompt_answers` tables (diff, order = position, uploaded files removed with their photo). New client-made ids (`newId`) are UUIDs so they are valid primary keys.
- **Other people's coordinates are 0/0 by design** (private); never compute distance from `user.location` of someone else. Use the server-provided distance.
- Seed data for the real database: `npm run seed -- --for you@example.com` (needs `SUPABASE_SECRET_KEY=... ` on that command only; never in a file or the app) creates the 44 mock-world people as tagged accounts (`@seed.fetching.test`, `app_metadata.is_seed`), centred on that account's saved location, plus incoming likes and matches for it. `npm run seed:clean -- --yes` deletes exactly the accounts that are flagged in `profiles.is_seed` AND tagged in auth app_metadata AND on the reserved domain (dry run without `--yes`). Pure planning is in `scripts/seedPlan.ts` / `interactionPlan.ts` (unit-tested; `supabase/tests/run.sh` also loads the plan into the real schema).
- Live tests hit the REAL project (throwaway accounts, self-cleaning; shared setup in `src/test/liveSupport.ts`): `set -a; source .env.local; set +a; RUN_LIVE_TESTS=1 npx jest src/services/supabase/__tests__/live --forceExit` (`live.integration` = repos, `live.flow.integration` = matching flow, `live.chat.integration` = chat; `--forceExit` because open realtime timers delay exit). They are skipped in `npm test`. (Jest stubs `fetch`, so the test installs `node-fetch`.)
- `supabase/migrations/` is the source of truth for the database (create new ones with `supabase migration new <name>`; never edit one after it has been pushed). Run `supabase/tests/run.sh` after changing policies or triggers: it applies them to a throwaway local Postgres and checks the rules as different users.
- Keys: `EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_KEY` (publishable) live in `.env.local` (git-ignored). The service-role/secret key must never go in the app or in git; only local scripts may use it.
- Rules that must not be client-trusted live in the database: daily like/Treat limits, match-on-mutual-like, block removes the match, Play Date edit/answer permissions. Error strings `like_quota_exceeded`, `treat_quota_exceeded`, `blocked`, `like_gone` map to the app's errors.
- Exact coordinates are in `profile_locations` (owner-only). Other people only get `city`; distances must be computed server-side.
- Seed/test accounts are real auth users created with `app_metadata.is_seed = true`; one cleanup script deletes exactly those (cascades remove their data).

## Mock accounts
Logins are remembered per account (`MockDb.accounts`). Log in with `config.demoAccountEmail` for the seeded demo user; an account you create via onboarding is only reachable with the phone/email you made it with. Unknown logins fail, like a real backend.

## Dev Menu
Settings -> long-press the version row. Switch mock user, reset data, simulate like/match/message, force empty states.

## Design identity
Palette (taken from the Login couple illustration): warm cream paper, **coral** (primary, `#C63D22` light / `#FF7F5F` dark), **apricot** (accent `#F6BE62`), **olive sage** (calm), deep teal-navy ink (`#12303F`); dark mode is a teal-black ground with cream text. Token names (`primary`, `accent`, `sage`) are roles, so recolouring is a one-file change in `src/theme/index.ts`. Fraunces (display) + Figtree (UI).
Illustrations are our own SVG spot art (`components/illustrations`), placeholders for commissioned art.
`design-inspo/` is reference only. Borrow patterns, never copy brands, colors or art.

## Phase status
- Phase 0 (done): setup, theme, nav shell, services + mocks, seed, Dev Menu, docs.
- Phase 1 (done): onboarding (both user types), profile view/edit/preview, pet profiles, photo management with drag-reorder.
- Phase 2 (done): matching module + tests, Discover (full profile scroll, per-item likes with comments, Skip), daily like limit, Treat, (pet compatibility drives ranking but is not displayed).
- Phase 3 (built, untested on device): Likes You -> profile -> Like back/Remove, match moment, matches list, chat, Play Date cards.
- Phase 4 (built, device check pending): Preferences + dealbreakers, unmatch/block/report, Account + persisted notification settings, error-state/accessibility audit.
- Later (not now): Supabase, push, verification/moderation, suggested venues for Play Dates, monetization.
