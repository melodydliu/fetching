import { render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Screen } from '../ui/Screen';

const metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

describe('Screen (scrolling)', () => {
  it('keeps the field being typed in visible above the keyboard, and taps working while it is open', async () => {
    await render(
      <SafeAreaProvider initialMetrics={metrics}>
        <Screen scroll testID="form-screen">
          <Text>Form</Text>
        </Screen>
      </SafeAreaProvider>,
    );
    const scroll = screen.getByTestId('form-screen');
    expect(scroll.props.automaticallyAdjustKeyboardInsets).toBe(true);
    expect(scroll.props.keyboardShouldPersistTaps).toBe('handled');
    expect(['interactive', 'on-drag']).toContain(scroll.props.keyboardDismissMode);
  });
});
