# Fetching: status and to-do

A dating app for people whose pets are family. Expo SDK 57 + React Native + TypeScript, running entirely on mock services.
Last updated after **Phase 2** and the **profile redesign** (see below). 184 unit tests passing across 11 suites.

Legend: `[x]` done · `[ ]` to do · `[~]` partly done

---

## Phase 0: Setup and shell (done)
- [x] Expo + TypeScript (strict), Expo Router, Zustand, TanStack Query, Reanimated, Gesture Handler, expo-image / image-picker / location
- [x] Jest + React Native Testing Library, ESLint + Prettier
- [x] Folder structure, theme (colors, type, spacing, radii, **dark mode**), tab navigation shell (Discover, Likes You, Matches, Profile)
- [x] Service interfaces for Auth, User, Pet, Discovery, Like, Match, Chat, Media, each with an in-memory mock (200–500ms latency)
- [x] One provider selects implementations (`EXPO_PUBLIC_USE_MOCKS`)
- [x] Strongly typed domain models (User, Pet, Prompt, Photo, Preferences, Dealbreakers, Like, Match, Message, DatePlan, Report)
- [x] Seed data: 45 users (~75% pet owners, dogs mostly, some cats/rabbits/birds/multi-pet), within ~30 miles of a configurable center
- [x] 30 prompts in a config file
- [x] Hidden Dev Menu (long-press the version in Settings): switch user, reset data, simulate like / match / message, force empty states, daily-limit overrides
- [x] `CLAUDE.md` and `README.md` (including Expo Go instructions)

## Phase 1: Onboarding and profile (done)
- [x] Onboarding, one question per screen with a progress bar: mocked phone/email sign-in → name → birthday (18+ enforced) → gender → interested in → location → relationship goals (pick several) → photos (min 3, optional captions) → "Do you have a pet?" → pet profile(s) **or** animal-lover path → 1–10 prompts (min 1) → done
- [x] Resumable: each step saves as you go, so relaunching picks up where you left off; optional steps can be skipped and finished later
- [x] Pet profile: name, species, breed (searchable list for dogs/cats, free text otherwise), age, size (dogs), energy, good with dogs/cats/kids, personality tags, 3+ photos; multiple pets
- [x] Animal-lover path: animals loved, allergies, open to dating someone with dogs/cats/other pets
- [x] Photo management with long-press drag-to-reorder (plus screen-reader move/remove actions)
- [x] Edit profile (photos + captions, prompts, basics, looking for, pets, lover preferences), profile preview, profile-completeness card
- [x] Per-account mock logins (log in with `melody@example.com` for the demo user)

## Phase 2: Matching and Discover (done)
- [x] Pure matching module (`src/domain/matching/`) with every weight in one `MATCHING_CONFIG`
  - [x] Hard filters: mutual orientation, age both ways, distance both ways, blocked / seen / liked / matched, dealbreakers from **either** user
  - [x] Pet compatibility score (0–100) with reasons: species cross-compat, allergies, energy, dog size, animal-lover prefs; "unsure"/unknown is neutral
  - [x] Ranking blend: pet compat, shared goals, distance, completeness, recency, soft preferences; boost for people who already liked you (bigger for a Treat)
  - [x] Thorough tests: multi-pet households, pet-less users, conflicting dealbreakers, unsure values, boundaries, seeded-world invariants
- [x] Discover: one full profile at a time, vertical scroll, **About [person]** and **Meet [pet]** sections, swipeable pet carousel (jump tabs were removed in the redesign)
- [x] Like a specific photo, prompt or pet with an optional comment (now icon-only hearts), Skip/Like as a floating pair (see redesign)
- [x] Daily like limit (default 8, configurable), one **Treat** per day (tops the recipient's Likes You list)
- [x] Friendly out-of-likes state with reset countdown; loading, empty and error states
- [x] Haptics on like
- [x] Sharp placeholder images (one person + one pet repeated per profile)
- Decision: the pet-match score/notes are **not shown** to users; they only drive ranking.

## Profile redesign (done, after Phase 2)
Layout inspired by `design-inspo/Profile-Inspo.png`, kept original to Fetching.
- [x] Full-bleed **hero photo** with a status-bar scrim; daily-likes / Treat chips sit on it
- [x] **Pet photo bubbles** (72pt, stacked, max 3 + "+N") bottom-right of the hero for pet owners; not tappable yet
- [x] Name + age in Fraunces, then a facts grid: **pets summary** ("1 dog, 2 cats"), job, city, relationship goals, distance
- [x] **Skip (✕) and Like (♡)** as a large floating pair (84pt buttons) above the tab bar, always visible; the hero Like opens the like sheet for the hero photo
- [x] Remaining photos full size with caption chip, prompt cards, pets in the tinted panel (unchanged for now); each item has an icon-only heart
- [x] Removed Discover title and section jump tabs; Preview uses the same layout
- [x] **Looking for** is multi-select (`user.relationshipGoals[]`); any overlap counts in filters and ranking
- [x] **1–10 prompts** (min 1, "Add another prompt" slot)
- [x] **Photo captions** on person photos (80 chars; tap a photo to edit, pencil hint when captioned); pet photos don't have captions
- Tried and dropped: split hero (person + pets side by side / strip). Pet bubbles won.

---

## Phase 3: Likes You, matches, chat (next)
- [ ] **Likes You**: tap a like to view the full profile, **Like back to match** or **Remove**; show exactly what they liked + their comment (the list and Treat-first ordering exist; the actions don't)
- [ ] Match creation from Likes You (the mock service already creates matches on mutual likes)
- [ ] **Match moment**: both users' photos plus their pets, haptics, "Send a message" CTA (currently just a toast)
- [ ] **Match list** with Hinge-style "Your turn" indicators (list and indicator exist; rows don't open anything)
- [ ] **Chat**: text messages, mocked realtime (simulated replies via Dev Menu)
- [ ] **Plan a Pup Date** chat action: dog park / patio café / hiking trail / beach / pet store / custom + date/time, rendered as a card the other person can **accept, suggest a change to, or decline**; mock venue suggestions (service methods exist; UI doesn't)
- [ ] Tests for the new flows

## Phase 4: Preferences, settings, safety, polish
- [ ] **Preferences screen**: age range, distance, gender, relationship goals, "show me: pet owners / animal lovers / both", pet preferences (species, size, energy)
- [ ] **Dealbreaker toggles** on every preference, plus "my pet isn't good with cats/dogs" and "I'm allergic to [species]" (the filtering logic and types are done and tested; there is no UI, so everyone currently runs on defaults)
- [ ] **Unmatch, block and report** (with reason picker) from chat **and** profile views (service methods exist; UI doesn't)
- [ ] Settings: account (mocked) detail screen, notification preferences that persist (UI toggles exist but aren't saved), pause account (done), log out (done), delete account with confirm (done)
- [ ] Empty/error-state audit across every screen
- [ ] Accessibility pass (labels, contrast, tap targets, reduce motion) and visual polish; verify dark mode everywhere
- [ ] Haptics on match (like haptics exist)

---

## Gaps and loose ends from earlier phases
- [ ] **Next design task:** rework how pets are viewed on a profile (the tinted "Meet [pet]" panel is a stopgap)
- [ ] Pet bubbles in the hero could scroll to / open that pet's card
- [ ] Captions for pet photos (carousel needs a layout for them)
- [ ] The hero Like targets the hero photo; consider a true "whole profile" like type (touches Likes You rendering)
- [ ] Other screens that show a profile (Likes You, matches) need the new hero layout when built in Phase 3
- [ ] Preferences "looking for" (Discover filter) is already multi in the data model; its UI comes in Phase 4
- [ ] Seed users still all have 3 prompts
- [ ] Animal lovers can't add optional pet photos (brief says optional)
- [ ] The pet editor tells owners to "switch to Animal Lover in Settings", but Settings has no such option (add it, or change the copy)
- [ ] Name, birthday, gender and "interested in" can't be edited after onboarding
- [ ] No undo for Pass
- [ ] Profile-completeness items on the Profile tab aren't tappable shortcuts
- [ ] Rabbit/bird pets use a plain placeholder tile (no sharp photo source found)
- [ ] Seed photos load from pravatar.cc, dog.ceo and thecatapi.com (needs network; swap for bundled images if that becomes a problem)
- [ ] Test coverage is domain/service-heavy; add React Native Testing Library component tests for the main screens
- [ ] App icon and splash are still the Expo template defaults
- [ ] Unconfirmed: the URL briefly showed `/dev-menu` right after sign-up on the web target; watch for a flash on device
- [ ] Two web-only React warnings about native accessibility props from library internals (harmless on iOS/Android)
- [ ] Illustrations are placeholder SVG spot art; commission or replace before launch
- [ ] App name is a placeholder ("Fetching"): one constant in `src/config` plus `app.json`

## Later (explicitly not now, per the brief)
- Supabase: auth, Postgres, storage, realtime chat (add real service implementations, flip `EXPO_PUBLIC_USE_MOCKS=false`)
- Expo push notifications
- Photo verification and moderation
- Real venue search for Pup Dates
- Monetization

---

## How to run
```bash
npm install
npm start            # scan the QR with Expo Go (use `npx expo start --tunnel` if your Wi-Fi blocks it)
npm test             # 184 tests
npm run typecheck && npm run lint
```
Architecture and conventions live in `CLAUDE.md`.
