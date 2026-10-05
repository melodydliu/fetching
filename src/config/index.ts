import type { GeoPoint } from '@/domain/types';

const env = process.env;

const num = (value: string | undefined, fallback: number) => {
  const parsed = value === undefined ? NaN : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

/** The one place app-wide knobs live. */
export const config = {
  appName: 'Fetching',
  /** When true the app runs entirely on in-memory mock services. */
  useMocks: env.EXPO_PUBLIC_USE_MOCKS !== 'false',
  /** Simulated network latency range for mock services, in ms. */
  mockLatencyMs: (env.EXPO_PUBLIC_MOCK_LATENCY === '0' ? [0, 0] : [200, 500]) as [number, number],
  mockCenter: {
    lat: num(env.EXPO_PUBLIC_MOCK_CENTER_LAT, 37.7749),
    lng: num(env.EXPO_PUBLIC_MOCK_CENTER_LNG, -122.4194),
    city: env.EXPO_PUBLIC_MOCK_CENTER_CITY ?? 'San Francisco',
  } satisfies GeoPoint & { city: string },
  /** Log in with this email (any 6-digit code) to get the seeded demo user. Mock mode only. */
  demoAccountEmail: 'melody@example.com',
  /** Seeded users live within this radius of the center. */
  seedRadiusMiles: 30,
  dailyLikeLimit: 8,
  dailyTreatLimit: 1,
  minAge: 18,
  maxAge: 99,
  minPhotos: 3,
  maxPhotos: 6,
  maxCaptionLength: 80,
  minPetPhotosForOwner: 3,
  minPetPhotos: 3,
  minPromptAnswers: 1,
  maxPromptAnswers: 10,
} as const;
