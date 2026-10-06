import { screen } from '@testing-library/react-native';
import { TypingIndicator } from '@/components/chat/TypingIndicator';
import { renderWithApp } from '@/test/render';

describe('TypingIndicator', () => {
  it('announces who is typing to screen readers', async () => {
    await renderWithApp(<TypingIndicator name="Maya" />);
    expect(screen.getByLabelText('Maya is typing')).toBeTruthy();
  });
});
