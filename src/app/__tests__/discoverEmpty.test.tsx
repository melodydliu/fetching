import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import { MockDb } from '@/services/mock';
import { SEED_VIEWER_ID } from '@/mocks/seed';
import { renderWithApp } from '@/test/render';
import DiscoverScreen from '../(tabs)/index';

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), navigate: jest.fn(), back: jest.fn(), replace: jest.fn() },
  useNavigation: () => ({ addListener: () => () => undefined, dispatch: jest.fn() }),
}));

beforeEach(() => jest.clearAllMocks());

/** Out of likes and the Treat: the "out of likes for today" empty state. */
const outOfLikes = (db: MockDb) => {
  db.quotaOverride = { likes: 0, treatAvailable: false };
  return db;
};

/** Nobody left to show: the viewer has already skipped everyone (likers still wait in Likes You). */
const noOneNearby = (db: MockDb) => {
  db.passes.set(
    SEED_VIEWER_ID,
    new Set([...db.users.keys()].filter((id) => id !== SEED_VIEWER_ID)),
  );
  return db;
};

const noLikesForViewer = (db: MockDb) => {
  db.likes = db.likes.filter((l) => l.toUserId !== SEED_VIEWER_ID);
  return db;
};

describe('Discover empty states and the Likes You link', () => {
  it('out of likes, with people who like you: offers "See Who Likes You" and it opens Likes You', async () => {
    await renderWithApp(<DiscoverScreen />, outOfLikes(new MockDb()));
    const link = await screen.findByText('See Who Likes You');
    expect(screen.queryByText('See Likes You')).toBeNull();
    expect(screen.getByText(/see who's already into you/i)).toBeTruthy();
    await fireEvent.press(link);
    expect(router.navigate).toHaveBeenCalledWith('/likes');
  });

  it('out of likes, with nobody who likes you: hides the link and the sentence that points at it', async () => {
    await renderWithApp(<DiscoverScreen />, noLikesForViewer(outOfLikes(new MockDb())));
    await screen.findByText("You're out of likes for today");
    await waitFor(() =>
      expect(screen.getByText(/Fresh likes and your next Treat arrive/)).toBeTruthy(),
    );
    expect(screen.queryByText('See Who Likes You')).toBeNull();
    expect(screen.queryByText(/who's already into you/i)).toBeNull();
  });

  it('seen everyone, with people who like you: offers Refresh and "See Who Likes You"', async () => {
    await renderWithApp(<DiscoverScreen />, noOneNearby(new MockDb()));
    expect(await screen.findByText('See Who Likes You')).toBeTruthy();
    expect(screen.getByText('Refresh')).toBeTruthy();
    expect(screen.getByText(/or see who's liked you/i)).toBeTruthy();
  });

  it('seen everyone, with nobody who likes you: only Refresh, and the copy stops pointing at Likes You', async () => {
    await renderWithApp(<DiscoverScreen />, noLikesForViewer(noOneNearby(new MockDb())));
    await screen.findByText("You've seen everyone nearby");
    expect(screen.getByText('Refresh')).toBeTruthy();
    expect(screen.getByText('New people and pets join every day. Check back soon!')).toBeTruthy();
    expect(screen.queryByText('See Who Likes You')).toBeNull();
    expect(screen.queryByText(/see who's liked you/i)).toBeNull();
  });
});
