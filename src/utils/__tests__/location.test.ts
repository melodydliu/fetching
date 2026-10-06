import { pickPlaceName } from '../location';

jest.mock('expo-location', () => ({}));

describe('pickPlaceName', () => {
  it('prefers city, then subregion, then region, then the fallback', () => {
    expect(pickPlaceName({ city: 'Oakland', subregion: 'Alameda', region: 'CA' }, 'x')).toBe(
      'Oakland',
    );
    expect(pickPlaceName({ city: null, subregion: 'Alameda', region: 'CA' }, 'x')).toBe('Alameda');
    expect(pickPlaceName({ city: null, subregion: null, region: 'CA' }, 'x')).toBe('CA');
    expect(pickPlaceName({}, 'Near you')).toBe('Near you');
    expect(pickPlaceName(undefined, 'Near you')).toBe('Near you');
  });
});
