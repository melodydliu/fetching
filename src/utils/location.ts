import * as ExpoLocation from 'expo-location';
import { config } from '@/config';
import type { Location } from '@/domain/types';

export type LocateResult =
  { ok: true; location: Location } | { ok: false; reason: 'denied' | 'not_found' | 'error' };

type Place = Partial<Pick<ExpoLocation.LocationGeocodedAddress, 'city' | 'subregion' | 'region'>>;

/** The friendliest name we can get for a place: city, then county/area, then state. */
export function pickPlaceName(place: Place | undefined, fallback: string): string {
  return place?.city || place?.subregion || place?.region || fallback;
}

const isZip = (text: string) => /^\d/.test(text);

async function nameFor(coords: { latitude: number; longitude: number }, fallback: string) {
  const [place] = await ExpoLocation.reverseGeocodeAsync(coords).catch(() => []);
  return pickPlaceName(place, fallback);
}

/**
 * Mock data is seeded around config.mockCenter, so while mocks are on we keep those
 * coordinates (with the real place name) or Discover would be empty away from home.
 */
function toProfileLocation(
  coords: { latitude: number; longitude: number },
  city: string,
): Location {
  return config.useMocks
    ? { lat: config.mockCenter.lat, lng: config.mockCenter.lng, city }
    : { lat: coords.latitude, lng: coords.longitude, city };
}

/** GPS: asks for permission, reads the position, names the place. */
export async function locateMe(): Promise<LocateResult> {
  try {
    const { status } = await ExpoLocation.requestForegroundPermissionsAsync();
    if (status !== 'granted') return { ok: false, reason: 'denied' };
    const pos = await ExpoLocation.getCurrentPositionAsync({
      accuracy: ExpoLocation.Accuracy.Balanced,
    });
    return {
      ok: true,
      location: toProfileLocation(pos.coords, await nameFor(pos.coords, 'Near you')),
    };
  } catch {
    return { ok: false, reason: 'error' };
  }
}

/** Typed city or zip code. Needs no permission. */
export async function lookUpPlace(query: string): Promise<LocateResult> {
  const text = query.trim();
  if (!text) return { ok: false, reason: 'not_found' };
  try {
    const [hit] = await ExpoLocation.geocodeAsync(text);
    if (!hit) return { ok: false, reason: 'not_found' };
    const name = await nameFor(hit, isZip(text) ? 'Near you' : text);
    return { ok: true, location: toProfileLocation(hit, name) };
  } catch {
    return { ok: false, reason: 'error' };
  }
}
