import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View, type ViewStyle } from 'react-native';
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
}

export const TAB_BAR_CLEARANCE = 104;

export function Screen({ children, scroll, tabbed, noTopInset, contentStyle }: ScreenProps) {
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
        style={[styles.flex, { backgroundColor: colors.background }]}
        contentContainerStyle={[padding, contentStyle]}
        contentInsetAdjustmentBehavior="never"
        showsVerticalScrollIndicator={false}
      >
        {children}
      </ScrollView>
    );
  }
  return (
    <View style={[styles.flex, { backgroundColor: colors.background }, padding, contentStyle]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({ flex: { flex: 1 } });
