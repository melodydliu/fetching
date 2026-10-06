import { fireEvent, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import { renderWithApp } from '@/test/render';
import ProfileScreen from '../(tabs)/profile';

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), navigate: jest.fn(), back: jest.fn(), replace: jest.fn() },
  useNavigation: () => ({ addListener: () => () => undefined, dispatch: jest.fn() }),
}));

beforeEach(() => jest.clearAllMocks());

describe('Profile tab', () => {
  it('has an eye button next to the name that opens the preview', async () => {
    await renderWithApp(<ProfileScreen />);
    const eye = await screen.findByRole('button', { name: 'Preview your profile' });
    await fireEvent.press(eye);
    expect(router.push).toHaveBeenCalledWith('/preview');
  });

  it('no longer lists Preview as a separate row, but keeps the other rows', async () => {
    await renderWithApp(<ProfileScreen />);
    await screen.findByRole('button', { name: 'Preview your profile' });
    expect(screen.queryByText('See your profile as others do')).toBeNull();
    expect(screen.queryByRole('button', { name: /^Preview,/ })).toBeNull();
    for (const row of ['Edit profile', 'Preferences', 'Settings']) {
      expect(screen.getByText(row)).toBeTruthy();
    }
  });
});
