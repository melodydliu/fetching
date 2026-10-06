# Fetching: status and to-do

A dating app for people whose pets are family. Expo SDK 57 + React Native + TypeScript, running entirely on mock services.
Last updated after **Phase 3** (code complete, not yet tried on a device). 197 unit tests passing across 12 suites.

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

## Phase 3: Likes You, matches, chat, Play Date (built; needs a pass on a device)
- [x] **Likes You** rows open the person's full profile (`app/user/[id].tsx`) with what they liked + their comment, and a floating **Remove** / **Like back** pair
- [x] **Like back** (`likes.likeBack`) creates the match without spending a daily like; Remove hides the like
- [x] **Match moment** (`app/match-moment.tsx`): both people and their pets, success haptic, "Send a message" / "Keep browsing". Shown after a mutual like in Discover and after Like back
- [x] **Matches list** rows open the chat; "Your turn" / "New" chips as before
- [x] **Chat** (`app/chat/[matchId].tsx`): text bubbles, inverted list, composer, read receipts on open, mocked realtime via `chat.subscribe` (Dev Menu: Incoming message / Incoming Play Date plan); header opens their profile
- [x] **Plan a Play Date** (`app/play-date/[matchId].tsx`, calendar button in the composer): dog park / pet-friendly café / hiking trail / beach / custom, optional free-text address, day + time chips, note. Lands in chat as a card
- [x] Date card: **Accept**, **Suggest a change** (new day/time + note), **Decline**; the card says whose answer it's waiting on (rules in `domain/datePlans.ts`, tested)
- [x] **Edit / delete** a Play Date you planned (Edit and Delete buttons on your own card): editing reuses the planner, sends it back to "proposed" so they confirm again; delete asks first and removes the card. Edit is only available before the date; the other person can't edit or delete (they can decline)
- [x] Dev Menu: "Incoming Play Date plan" and "They accept my Play Date"
- [x] Tests: date-plan rules, like back, change-suggested flow
- [ ] Open items: try it on a device/Expo Go (no screens were run in a simulator yet); no day separators or typing indicator in chat; date plans don't post a system line when answered; no push; unmatch/block/report UI is Phase 4; Likes You rows are still a list, not a grid

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
- [x] Other screens that show a profile (Likes You, chat header) use the hero layout via `app/user/[id].tsx`
- [ ] Preferences "looking for" (Discover filter) is already multi in the data model; its UI comes in Phase 4
- [ ] Seed users still all have 3 prompts
- [ ] Animal lovers can't add optional pet photos (brief says optional)
- [ ] The pet editor tells owners to "switch to Animal Lover in Settings", but Settings has no such option (add it, or change the copy)
- [x] Edit profile uses a draft with a **Save changes** button (disabled until something changes or while the name/birthday is invalid); leaving with unsaved edits asks to discard. Pets still save on their own screen
- [x] Name and birthday can now be edited in Edit profile (birthday keeps the 18+ check; the old one stays until the new one is valid)
- [x] **Location** in Edit profile: "Use my current location" (GPS) or type a city / zip code (geocoded; while mocks are on it keeps the real place name but `config.mockCenter` coordinates, like onboarding)
- [ ] Gender and "interested in" still can't be edited after onboarding
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
- Suggested venues for Play Dates (removed from the MVP: the planner only takes a typed address). Needs real venue search (e.g. Google Places / Foursquare) near the midpoint of the two matched users, so `chat.suggestVenues(kind, location)` and a `Venue` type would come back
- Monetization

---

## How to run
```bash
npm install
npm start            # scan the QR with Expo Go (use `npx expo start --tunnel` if your Wi-Fi blocks it)
npm test             # 197 tests
npm run typecheck && npm run lint
```
Architecture and conventions live in `CLAUDE.md`.
