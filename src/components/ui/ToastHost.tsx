import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/hooks/useTheme';
import { useToastStore } from '@/state/toastStore';
import { Text } from './Text';

/** Mounted once at the root. Shows `useToastStore().show(message)` for ~2.5s. */
export function ToastHost() {
  const { message, nonce, hide } = useToastStore();
  const { colors, radii, spacing } = useTheme();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(hide, 2500);
    return () => clearTimeout(timer);
  }, [message, nonce, hide]);

  if (!message) return null;
  return (
    <Animated.View
      key={nonce}
      entering={FadeInDown}
      exiting={FadeOutDown}
      accessibilityLiveRegion="polite"
      pointerEvents="none"
      style={[
        styles.toast,
        {
          bottom: insets.bottom + 110,
          backgroundColor: colors.text,
          borderRadius: radii.lg,
          paddingHorizontal: spacing.lg,
          paddingVertical: spacing.md,
        },
      ]}
    >
      <Text variant="smallStrong" style={{ color: colors.background }}>
        {message}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  toast: { position: 'absolute', left: 24, right: 24, alignItems: 'center' },
});
