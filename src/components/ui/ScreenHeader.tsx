import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { hitSize } from '@/theme';
import { Icon } from './Icon';
import { Text } from './Text';

export function ScreenHeader({ title, back }: { title: string; back?: boolean }) {
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
