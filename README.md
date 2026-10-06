# Fetching

A dating app for people whose pets are family. Expo + React Native + TypeScript.
Currently runs entirely on mock data (no backend, no real auth).

## Run it on your phone (Expo Go)
1. Install **Expo Go** from the App Store / Play Store.
2. `npm install`
3. `npm start`
4. Scan the QR code (iOS: Camera app; Android: inside Expo Go). Phone and computer must be on the same Wi-Fi.
   If that fails, try `npx expo start --tunnel`.

Simulators: `npm run ios` (needs Xcode) or `npm run android` (needs Android Studio).

## Try the mock world
You start signed in as "Melody" with a dog, 5 people who liked you, and 3 matches.
Open **Profile -> Settings** and **long-press the version number** for the Dev Menu:
switch users, reset data, simulate a like/match/message, or force empty states.

## Try onboarding
Settings -> Log out -> Get started. Any phone/email and any 6-digit code works.
Log back in later with the same phone/email. To get the seeded demo user (Melody), log in with `melody@example.com`.
Quit mid-way and relaunch to see it resume. Photos use your real photo library.

## Try Discover
Heart any photo, prompt or pet (optionally add a comment), or tap X to skip. Send a Treat from the like sheet.
Dev Menu -> Daily limits lets you jump straight to the out-of-likes states.

## Running on the real backend (Supabase)
Mock mode stays the default. To use your real Supabase project instead:
1. Make sure `.env.local` (git-ignored) has `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_KEY` (the publishable key), then add `EXPO_PUBLIC_USE_MOCKS=false` there and restart `npm start` (press `r`, or `npx expo start -c`).
2. Open the app, **create an account** (email + password) and finish onboarding, including the location step (you need real photos too). New accounts start empty.
3. Fill the database with test people around you (44 of them, plus likes and matches for your account). Get your **secret key** from the Supabase dashboard (Project Settings -> API Keys -> Secret keys) and pass it for this one command only:
   `SUPABASE_SECRET_KEY=sb_secret_... npm run seed -- --for you@example.com`
   (`npm run seed -- --dry-run` shows the plan without a key.)
4. When you're done testing or before launch, remove every seeded account:
   `SUPABASE_SECRET_KEY=sb_secret_... npm run seed:clean` (dry run), then add `-- --yes` to delete.
The secret key bypasses every security rule: never put it in a file, in the app, or in a chat.
Go back to mock mode any time by removing the line from `.env.local`.

## Scripts
`npm test` · `npm run typecheck` · `npm run lint` · `npm run format` · `npm run seed` · `npm run seed:clean`
Database checks (needs Postgres on your PATH): `supabase/tests/run.sh`. Live tests against your real project: see `CLAUDE.md`.

## Config
Copy `.env.example` to `.env` to change the mock center point. `EXPO_PUBLIC_USE_MOCKS=false` switches to the real Supabase services (see above).
Seed photos come from randomuser.me, dog.ceo and thecatapi (network needed); rabbit/bird pets use a bundled tile.

See `CLAUDE.md` for architecture and conventions.
