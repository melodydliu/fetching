import type { ReactNode } from 'react';
import { Platform, ScrollView, StyleSheet, View, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/hooks/useTheme';

interface ScreenProps {
  children: ReactNode;
  scroll?: boolean;
  /** Reserve room for the floating tab bar. */
  tabbed?: boolean;
  /** Skip the top inset when a native header already handles it. */
  noTopInset?: boolean;
  contentStyle?: ViewStyle;
  testID?: string;
}

export const TAB_BAR_CLEARANCE = 104;

export function Screen({
  children,
  scroll,
  tabbed,
  noTopInset,
  contentStyle,
  testID,
}: ScreenProps) {
  const { colors, spacing } = useTheme();
  const insets = useSafeAreaInsets();
  const padding = {
    paddingTop: noTopInset ? spacing.md : insets.top + spacing.md,
    paddingBottom: tabbed ? TAB_BAR_CLEARANCE + insets.bottom : insets.bottom + spacing.lg,
    paddingHorizontal: spacing.lg,
  };

  if (scroll) {
    return (
      <ScrollView
        testID={testID}
        style={[styles.flex, { backgroundColor: colors.background }]}
        contentContainerStyle={[padding, contentStyle]}
        contentInsetAdjustmentBehavior="never"
        showsVerticalScrollIndicator={false}
        // The keyboard must never hide the field being typed in: on iOS the page makes room for
        // the keyboard and scrolls the focused field into view (Android resizes the window).
        automaticallyAdjustKeyboardInsets
        // Buttons still respond to the first tap while the keyboard is open, and dragging the
        // page dismisses the keyboard.
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
      >
        {children}
      </ScrollView>
    );
  }
  return (
    <View
      testID={testID}
      style={[styles.flex, { backgroundColor: colors.background }, padding, contentStyle]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({ flex: { flex: 1 } });
