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

## Scripts
`npm test` · `npm run typecheck` · `npm run lint` · `npm run format`

## Config
Copy `.env.example` to `.env` to change the mock center point. `EXPO_PUBLIC_USE_MOCKS=false` is reserved for the future Supabase services.
Seed photos come from randomuser.me, dog.ceo and thecatapi (network needed); rabbit/bird pets use a bundled tile.

See `CLAUDE.md` for architecture and conventions.
