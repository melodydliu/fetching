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
- Likes: `LikeRepository.send` enforces daily limit + one Treat/day + no duplicate likes; Dev Menu -> Daily limits overrides quota for testing.
- Profile layout (`ProfileView`): full-bleed hero photo (+ pet photo bubbles bottom-right), then name/age, a facts grid (pets summary, job, city, goal, distance), then photos/prompts/pets. Skip and Like are a floating pair in Discover (`app/(tabs)/index.tsx`); the Like opens the sheet for the hero photo. Each photo/prompt/pet still has its own icon-only heart. Render it edge to edge (no parent padding).
- Profile content: `user.relationshipGoals` is multi-select (empty = unknown/neutral; any overlap counts in matching). Prompts: 1-10 (`config.minPromptAnswers`/`maxPromptAnswers`). Person photos can carry a caption (`PhotoGrid captions`, `CaptionModal`); pet photos don't yet.
- Preferences UI doesn't exist until Phase 4, so everyone runs on defaults (age = yours -8/+10, 25 miles).

## Chat & Play Date (Phase 3)
- Routes: `user/[id]` (any profile; `?likeId=` adds the Like back / Remove bar), `chat/[matchId]`, `play-date/[matchId]` (modal), `match-moment` (full-screen modal, `?matchId=`).
- `likes.likeBack(likeId, viewerId)` matches without spending a daily like. Mutual likes sent from Discover also go to the match moment.
- Chat uses TanStack Query for messages; `chat.subscribe` pushes new ones into the cache (dedupe by id). Opening a chat marks it read.
- Date plan rules are pure (`domain/datePlans.ts`): `DatePlan.respondedById` records who last answered; a suggested change waits on the *other* person. Only the proposer can edit (future dates only; resets to `proposed`) or delete (`/play-date/[matchId]?planId=` is the edit mode of the planner). Day/time picking uses plain chips (`components/chat/DateTimePicker.tsx`), no native picker dependency.

## Mock accounts
Logins are remembered per account (`MockDb.accounts`). Log in with `config.demoAccountEmail` for the seeded demo user; an account you create via onboarding is only reachable with the phone/email you made it with. Unknown logins fail, like a real backend.

## Dev Menu
Settings -> long-press the version row. Switch mock user, reset data, simulate like/match/message, force empty states.

## Design identity
Original palette: cream paper, **berry** (primary), **butter** (accent), **sage** (calm), aubergine ink. Fraunces (display) + Figtree (UI).
Illustrations are our own SVG spot art (`components/illustrations`), placeholders for commissioned art.
`design-inspo/` is reference only. Borrow patterns, never copy brands, colors or art.

## Phase status
- Phase 0 (done): setup, theme, nav shell, services + mocks, seed, Dev Menu, docs.
- Phase 1 (done): onboarding (both user types), profile view/edit/preview, pet profiles, photo management with drag-reorder.
- Phase 2 (done): matching module + tests, Discover (full profile scroll, per-item likes with comments, Skip), daily like limit, Treat, (pet compatibility drives ranking but is not displayed).
- Phase 3 (built, untested on device): Likes You -> profile -> Like back/Remove, match moment, matches list, chat, Play Date cards.
- Phase 4: preferences, settings, safety (unmatch/block/report UI), polish.
- Later (not now): Supabase, push, verification/moderation, suggested venues for Play Dates, monetization.
