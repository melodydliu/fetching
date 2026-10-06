import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import { SEED_VIEWER_ID } from '@/mocks/seed';
import { MockDb } from '@/services/mock';
import { renderWithApp } from '@/test/render';
import LikesYouScreen from '../(tabs)/likes';
import PreferencesScreen from '../preferences';
import MatchesScreen from '../(tabs)/matches';

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), navigate: jest.fn(), back: jest.fn(), replace: jest.fn() },
  useNavigation: () => ({ addListener: () => () => undefined, dispatch: jest.fn() }),
}));

beforeEach(() => jest.clearAllMocks());

describe('Likes You', () => {
  it('shows who liked you as a grid of cards and opens their profile', async () => {
    await renderWithApp(<LikesYouScreen />);
    await waitFor(() => expect(screen.getAllByLabelText(/, liked /).length).toBeGreaterThan(0));
    expect(screen.getAllByLabelText(/sent a Treat/).length).toBeGreaterThan(0);
    await fireEvent.press(screen.getAllByRole('button')[0]!);
    expect(router.push).toHaveBeenCalledWith(
      expect.objectContaining({
        pathname: '/user/[id]',
        params: expect.objectContaining({ likeId: expect.any(String) }),
      }),
    );
  });

  it('shows the empty state when nobody has liked you', async () => {
    const db = new MockDb();
    db.likes = [];
    await renderWithApp(<LikesYouScreen />, db);
    await waitFor(() => expect(screen.getByText(/No likes yet/)).toBeTruthy());
  });
});

describe('Matches', () => {
  it('shows Your turn and New chips and opens a chat', async () => {
    await renderWithApp(<MatchesScreen />);
    await waitFor(() => expect(screen.getByText('Your turn')).toBeTruthy());
    expect(screen.getByText('New')).toBeTruthy();
    await fireEvent.press(screen.getAllByRole('button')[0]!);
    expect(router.push).toHaveBeenCalledWith(
      expect.objectContaining({ pathname: '/chat/[matchId]' }),
    );
  });

  it('shows the empty state with no matches', async () => {
    const db = new MockDb();
    db.matches = [];
    await renderWithApp(<MatchesScreen />, db);
    await waitFor(() => expect(screen.getByText(/first match is out there/)).toBeTruthy());
  });
});

describe('Preferences', () => {
  it('Save stays disabled until something changes, then saves the new preferences', async () => {
    const { db } = await renderWithApp(<PreferencesScreen />);
    await waitFor(() => expect(screen.getByLabelText('Increase Youngest')).toBeTruthy());
    expect(screen.getByLabelText('Save changes').props.accessibilityState.disabled).toBe(true);

    const before = db.users.get(SEED_VIEWER_ID)!.preferences.ageRange.min;
    await fireEvent.press(screen.getByLabelText('Increase Youngest'));
    await fireEvent.press(screen.getByLabelText('Save changes'));

    await waitFor(() =>
      expect(db.users.get(SEED_VIEWER_ID)!.preferences.ageRange.min).toBe(before + 1),
    );
    expect(router.back).toHaveBeenCalled();
  });

  it('a dealbreaker switch is disabled until something is picked', async () => {
    await renderWithApp(<PreferencesScreen />);
    await waitFor(() => expect(screen.getByLabelText('Dealbreaker: looking for')).toBeTruthy());
    expect(
      screen.getByLabelText('Dealbreaker: looking for').props.accessibilityState.disabled,
    ).toBe(true);
  });
});
