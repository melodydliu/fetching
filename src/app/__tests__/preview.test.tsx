import { screen } from '@testing-library/react-native';
import { ProfileView } from '@/components/ProfileView';
import { MockDb } from '@/services/mock';
import { SEED_VIEWER_ID } from '@/mocks/seed';
import { renderWithApp } from '@/test/render';
import PreviewScreen from '../preview';

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), navigate: jest.fn(), back: jest.fn(), replace: jest.fn() },
  useNavigation: () => ({ addListener: () => () => undefined, dispatch: jest.fn() }),
}));

describe('Preview screen', () => {
  it('explains what it shows, and draws no status-bar shading across the photo', async () => {
    await renderWithApp(<PreviewScreen />);
    expect(await screen.findByText('This is how your profile looks to other users')).toBeTruthy();
    expect(screen.queryByText('This is how others see you')).toBeNull();
    // Wait for the profile itself (the name appears in the profile facts).
    await screen.findAllByText(/Melody/);
    expect(screen.queryByTestId('status-bar-scrim')).toBeNull();
  });
});

describe('ProfileView status-bar shading', () => {
  const db = new MockDb();
  const profile = {
    user: db.users.get(SEED_VIEWER_ID)!,
    pets: [...db.pets.values()].filter((p) => p.ownerId === SEED_VIEWER_ID),
  };

  it('is on by default, for photos that run to the top of the screen', async () => {
    await renderWithApp(<ProfileView profile={profile} />);
    expect(screen.getByTestId('status-bar-scrim')).toBeTruthy();
  });

  it('can be turned off', async () => {
    await renderWithApp(<ProfileView profile={profile} statusBarScrim={false} />);
    expect(screen.queryByTestId('status-bar-scrim')).toBeNull();
  });
});
