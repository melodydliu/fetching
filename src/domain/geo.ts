import type { GeoPoint, ISODate } from './types';

const EARTH_RADIUS_MILES = 3958.8;

const toRad = (deg: number) => (deg * Math.PI) / 180;

/**
 * False for the 0/0 placeholder the real backend gives for other people (their exact location
 * is private), so callers don't compute a nonsense distance from it.
 */
export const hasCoordinates = (point: GeoPoint): boolean => point.lat !== 0 || point.lng !== 0;

/** Great-circle distance in miles. */
export function distanceMiles(a: GeoPoint, b: GeoPoint): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_MILES * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Whole years between a birthdate and `now`. */
export function ageFromBirthdate(birthdate: ISODate, now: Date = new Date()): number {
  const born = new Date(birthdate);
  let age = now.getUTCFullYear() - born.getUTCFullYear();
  const hadBirthday =
    now.getUTCMonth() > born.getUTCMonth() ||
    (now.getUTCMonth() === born.getUTCMonth() && now.getUTCDate() >= born.getUTCDate());
  if (!hadBirthday) age -= 1;
  return age;
}
