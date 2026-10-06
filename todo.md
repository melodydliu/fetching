# Fetching: status and to-do

A dating app for people whose pets are family. Expo SDK 57 + React Native + TypeScript. Runs on mock services by default and on a real Supabase backend (`EXPO_PUBLIC_USE_MOCKS=false`).
Last updated after the illustrations, icon and splash, Discover top bar, photo removal and the age slider. 337 unit tests passing across 34 suites (+18 live Supabase tests, skipped unless asked); typecheck and lint clean.

## Where things stand
All four build phases are code-complete. The real backend is built and verified by automated tests (68 local rule checks, 18 live tests) and the app has been checked in Expo Go on mock data. **Branding is done** (custom illustrations, app icon, splash) apart from the final app name. What remains is mostly proving it on the real backend, accounts and legal, and store setup.

## Before launch (in suggested order)
**A. Prove it on the real backend (you can do this now)**
- [ ] Seed the real database (`npm run seed -- --for you@example.com`), set `EXPO_PUBLIC_USE_MOCKS=false` in `.env.local`, and do a full device pass: sign-up, onboarding with real photo uploads, Discover, likes, matching, chat (typing, read receipts), Play Dates, block / report / unmatch, delete account.
- [ ] Known gaps to look at during that pass: no distance line on profiles opened from Likes You / Matches (coordinates are private); Play Date cards don't update live when the other person answers (they refetch on open; a `date_plans` realtime subscription would fix it); daily limits reset at midnight UTC, mock uses local time, so the "resets at" countdown differs.
- [ ] Look at dark mode by eye on a phone (so far checked by contrast tests only).
- [ ] Check by eye: age slider handles are easy to grab and don't trigger swipe-back; the photo remove × is easy to spot; Discover's top strip and taller hero feel right.

**B. Accounts and email (needs a domain: start early)**
- [ ] Buy a domain; set up custom SMTP (Supabase free tier can't edit email templates without it); turn "Confirm email" back ON (it's off for development only).
- [ ] **Forgot password / reset password** (does not exist yet; needs email sending).
- [ ] Later: emailed codes, phone sign-in.

**C. Safety and moderation**
- [ ] A way to review reports (they go into a write-only `reports` table today) and act: remove a user, remove a photo, respond within about a day. Check the current App Store / Google Play rules for user-generated content.
- [ ] Basic photo moderation or verification (public photos in a dating app attract abuse quickly).
- [ ] Longer term: rate-limit location changes (rounding limits but doesn't eliminate trilateration, see the `discovery_distances` migration notes).

**D. Legal**
- [ ] Privacy policy and Terms of Service; link them from sign-up and Settings, and from the store listings.

**E. Production clean-up**
- [ ] Remove seed accounts: `npm run seed:clean -- --yes` (dry run without `--yes`).
- [ ] Supabase dashboard: turn OFF "Allow public access" in Realtime settings (defense in depth; the live test already shows an outsider can't hear a match's typing).
- [ ] Move to a paid Supabase plan (free projects pause when idle and have no backups); consider a separate production project.
- [ ] Add crash reporting (e.g. Sentry); there is none today.

**F. Build and store setup**
- [ ] Apple Developer account ($99/year) and Google Play account ($25 one-time).
- [ ] Final app name (one constant in `src/config` plus `app.json`), bundle identifier / package name, and EAS build configuration (none yet).
- [ ] Check the icon and splash on a real build (Expo Go always shows its own icon).
- [ ] Store listing: screenshots, description, privacy answers; TestFlight and Play internal testing with a few real people.

## Strongly recommended, not strictly blocking
- [ ] **Push notifications** (Expo push; notification settings are already stored per user, nothing sends yet).
- [ ] Small extras: a "like the whole profile" type, optional photos for animal lovers, real rabbit/bird seed photos (seed only; goes away with the seed data).

## Later (per the brief)
- Suggested venues for Play Dates (needs real venue search, e.g. Google Places / Foursquare, near the midpoint of the two matched users: `chat.suggestVenues(kind, location)` and a `Venue` type).
- Phone sign-in, emailed codes.
- Monetization.

## Keep an eye on
- Whether "empty Preferences section = no preference" feels intuitive in real use.
- The two Discover empty states share one illustration (`empty-discover-out-of-likes` and `empty-discover-no-one-nearby` are the same file); replace either to differentiate.

## Decisions made
Keep the Preferences model as is (an empty section = no preference; the Dealbreaker switch makes a section strict; pet filters apply to animal lovers). Keep the tinted "Meet [pet]" panel, and the pet-bubble sheet matches it. Pet-match scores are never shown to users (they only drive ranking). Email + password sign-in for now.

---

## Phase 0: Setup and shell (done)
- [x] Expo + TypeScript (strict), Expo Router, Zustand, TanStack Query, Reanimated, Gesture Handler, expo-image / image-picker / location
- [x] Jest + React Native Testing Library, ESLint + Prettier
- [x] Folder structure, theme (colors, type, spacing, radii, **dark mode**), tab navigation shell (Discover, Likes You, Matches, Profile)
- [x] Service interfaces for Auth, User, Pet, Discovery, Like, Match, Chat, Media, each with an in-memory mock (200–500ms latency)
- [x] One provider selects implementations (`EXPO_PUBLIC_USE_MOCKS`)
- [x] Strongly typed domain models (User, Pet, Prompt, Photo, Preferences, Dealbreakers, Like, Match, Message, DatePlan, Report)
- [x] Seed data: 44 users (~75% pet owners, dogs mostly, some cats/rabbits/birds/multi-pet), within ~30 miles of a configurable center
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
- [x] Full-bleed **hero photo** (taller since the Discover top-bar change); on Discover the daily-likes / Treat chips now sit in a strip above the photo, with no scrim
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

## Phase 3: Likes You, matches, chat, Play Date (done; device pass pending)
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
- [ ] Open items: try it on a device/Expo Go; date plans don't post a system line when answered; no push

## Phase 4: Preferences, settings, safety, polish (done; device check pending)
- [x] **Preferences screen** (`app/preferences.tsx`, Profile tab → Preferences): age range slider (two handles), distance, gender (when you're interested in more than one), looking for, show me (pet owners / animal lovers / everyone), their pets (species, dog size, energy). Draft + **Save changes**, discard prompt, "Reset to defaults". Rules in `domain/preferencesDraft.ts`
- [x] **Dealbreaker toggles** under every preference except age and distance (those always apply, both ways); a toggle is disabled until something is picked and is switched off automatically if you clear the selection
- [x] **My pet isn't good with dogs/cats** (pet owners) and **I'm allergic to** + "hide people who have these animals" (everyone). Allergies moved here from Edit profile
- [x] Changing "Interested in" in Edit profile also resets the Gender preference so they never disagree (`profileUpdateFor`)
- [x] **Unmatch, block and report** (`components/safety/SafetySheet.tsx`): the ⋯ button in the chat header, on the hero of any profile (Discover, Likes You, a match's profile). Report asks for a reason (+ optional details, + "also block"). Blocking removes the match and chat; blocked people drop out of Discover/Likes You. Settings → **Blocked people** lists and undoes blocks
- [x] Settings: **Account** screen (masked sign-in, member since), **notification preferences now persist** (matches, messages, likes, Play Dates), pause / log out / delete (confirm) as before
- [x] Empty/error-state audit: every screen that loads data now has loading + error (and empty where it lists); Preview, Pet editor and Onboarding gained error states. The Pet editor also asks before discarding unsaved changes
- [x] Accessibility: contrast of every text/background token pair is unit-tested in light **and** dark (≥ 4.5:1); the age slider's handles expose increment/decrement to screen readers; tap targets re-audited (small icon buttons use hitSlop to reach 48pt); skeletons and animations respect reduce-motion
- [x] Haptics on match (success haptic on the match moment, and when you like back / mutual like)
- [ ] Dark mode has been checked by contrast tests only, not by eye on a device
- [ ] Notification settings are stored but nothing sends push yet (Later)

---

## Gaps and loose ends from earlier phases
- [x] Pet viewing on a profile: decided to keep the tinted "Meet [pet]" panel (the pet-bubble sheet matches it)
- [x] Pet bubbles in the hero open that pet's card in a sheet
- [x] Captions for pet photos (editable in the pet form, shown over the carousel photo)
- [ ] The hero Like targets the hero photo; consider a true "whole profile" like type (touches Likes You rendering)
- [x] Other screens that show a profile (Likes You, chat header) use the hero layout via `app/user/[id].tsx`
- [x] Preferences "looking for" is multi-select in the Preferences screen
- [x] Seed users now have 1–5 prompts each
- [ ] Animal lovers can't add optional photos of animals they love (brief says optional; not needed for MVP)
- [x] There is no account type to pick: a profile is a **pet owner exactly when it has a pet** (`domain/accountKind.ts` keeps `user.kind` in step when a pet is added or the last one removed). Animal lovers get an **Add a pet** button in Edit profile; removing your last pet makes you an animal lover (pet-only prompts are dropped)
- [x] Edit profile uses a draft with a **Save changes** button (disabled until something changes or while the name/birthday is invalid); leaving with unsaved edits asks to discard. Pets still save on their own screen
- [x] Name and birthday can now be edited in Edit profile (birthday keeps the 18+ check; the old one stays until the new one is valid)
- [x] **Location** in Edit profile: "Use my current location" (GPS) or type a city / zip code (geocoded; while mocks are on it keeps the real place name but `config.mockCenter` coordinates, like onboarding)
- [x] Gender and "interested in" are editable in Edit profile (must pick at least one "interested in")
- [x] **Undo** after Skip on Discover (`discovery.unpass`)
- [x] Profile-completeness items on the Profile tab are tappable shortcuts (Edit profile, or the pet screen)
- [x] Device pass (web build in a phone-width frame; native-only things like haptics and GPS still need Expo Go): fixed floating Skip/Like pair landing at the bottom of the page on web, seeded likes pointing at the *sender's* prompts (Likes You said "Liked your prompt"), missing chevron on rows with chips, and confirmation dialogs (Alert does nothing on web: use `utils/confirm.ts`)
- [x] Chat day separators (Today / Yesterday / date)
- [x] Likes You is now a 2-column photo grid (`components/likes/LikeCard.tsx`), so it no longer looks like the Matches list
- [x] Chat typing indicator: three bouncing dots under the newest message (`TypingIndicator`); `chat.setTyping`/`subscribeTyping`; Dev Menu → "They're typing (15s)"
- [ ] Rabbit/bird pets use a plain placeholder tile (no sharp photo source found)
- [ ] Seed photos load from pravatar.cc, dog.ceo and thecatapi.com (needs network; swap for bundled images if that becomes a problem)
- [x] React Native Testing Library component tests started: `DatePlanCard`, Likes You and Matches screens (`src/test/render.tsx` gives a mock-services render helper; Reanimated is mocked in `jest.setup.ts`). More screens still to cover
- [x] Custom app icon and splash in place (check them on a real build; Expo Go shows its own icon)
- [ ] Unconfirmed: the URL briefly showed `/dev-menu` right after sign-up on the web target; watch for a flash on device
- [ ] Two web-only React warnings about native accessibility props from library internals (harmless on iOS/Android)
- [x] Custom illustrations in place (11 PNGs in `assets/illustrations/`, shown through `components/illustrations/Illustration.tsx`); empty states centre the picture and copy with the button pinned to the bottom

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
npm test             # 337 tests
npm run typecheck && npm run lint
```
Architecture and conventions live in `CLAUDE.md`.
