import { ageFromBirthdate, distanceMiles, hasCoordinates } from '../geo';

describe('distanceMiles', () => {
  it('is zero for identical points', () => {
    const p = { lat: 37.77, lng: -122.42 };
    expect(distanceMiles(p, p)).toBeCloseTo(0, 5);
  });

  it('matches a known distance (SF to Oakland is roughly 8 miles)', () => {
    const sf = { lat: 37.7749, lng: -122.4194 };
    const oakland = { lat: 37.8044, lng: -122.2712 };
    expect(distanceMiles(sf, oakland)).toBeGreaterThan(7);
    expect(distanceMiles(sf, oakland)).toBeLessThan(9.5);
  });

  it('is symmetric', () => {
    const a = { lat: 40, lng: -74 };
    const b = { lat: 41, lng: -73 };
    expect(distanceMiles(a, b)).toBeCloseTo(distanceMiles(b, a), 8);
  });
});

describe('hasCoordinates', () => {
  it('is false only for the 0/0 placeholder used for private locations', () => {
    expect(hasCoordinates({ lat: 0, lng: 0 })).toBe(false);
    expect(hasCoordinates({ lat: 37.77, lng: -122.42 })).toBe(true);
    expect(hasCoordinates({ lat: 0, lng: 10 })).toBe(true);
  });
});

describe('ageFromBirthdate', () => {
  const now = new Date('2026-10-05T00:00:00Z');

  it('counts a birthday that already happened this year', () => {
    expect(ageFromBirthdate('1996-03-01', now)).toBe(30);
  });

  it('does not count a birthday still to come this year', () => {
    expect(ageFromBirthdate('1996-12-01', now)).toBe(29);
  });

  it('counts the birthday on the day itself', () => {
    expect(ageFromBirthdate('1996-10-05', now)).toBe(30);
  });
});
