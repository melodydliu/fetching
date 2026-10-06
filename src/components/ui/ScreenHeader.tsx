import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { hitSize } from '@/theme';
import { Icon } from './Icon';
import { Text } from './Text';

export function ScreenHeader({
  title,
  back,
  trailing,
}: {
  title: string;
  back?: boolean;
  /** Sits at the right end of the header, e.g. an `InfoTip`. */
  trailing?: ReactNode;
}) {
  const { colors, spacing } = useTheme();
  return (
    <View style={[styles.row, { gap: spacing.sm, marginBottom: spacing.lg }]}>
      {back && (
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          hitSlop={8}
          style={styles.back}
        >
          <Icon name="chevron-left" color={colors.text} />
        </Pressable>
      )}
      <Text variant="title" style={styles.title}>
        {title}
      </Text>
      {trailing}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  back: {
    width: hitSize,
    height: hitSize,
    marginLeft: -12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { flex: 1 },
});
