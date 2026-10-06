import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { hitSize } from '@/theme';
import { Icon } from './Icon';
import { Text } from './Text';

interface ListRowProps {
  title: string;
  subtitle?: string;
  leading?: ReactNode;
  trailing?: ReactNode;
  onPress?: () => void;
  onLongPress?: () => void;
  /** Show a chevron when pressable and no custom trailing element is given. */
  chevron?: boolean;
  tone?: 'default' | 'danger';
  accessibilityHint?: string;
}

export function ListRow({
  title,
  subtitle,
  leading,
  trailing,
  onPress,
  onLongPress,
  chevron = true,
  tone = 'default',
  accessibilityHint,
}: ListRowProps) {
  const { colors, radii, spacing } = useTheme();
  const interactive = !!(onPress || onLongPress);
  return (
    <Pressable
      disabled={!interactive}
      onPress={onPress}
      onLongPress={onLongPress}
      accessibilityRole={interactive ? 'button' : undefined}
      accessibilityLabel={subtitle ? `${title}, ${subtitle}` : title}
      accessibilityHint={accessibilityHint}
      style={({ pressed }) => [
        styles.row,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderRadius: radii.lg,
          padding: spacing.md,
          gap: spacing.md,
          opacity: pressed ? 0.85 : 1,
        },
      ]}
    >
      {leading}
      <View style={styles.text}>
        <Text variant="bodyStrong" color={tone === 'danger' ? 'danger' : 'text'}>
          {title}
        </Text>
        {subtitle ? (
          <Text variant="small" color="textMuted" numberOfLines={2}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {trailing}
      {interactive && chevron ? (
        <Icon name="chevron-right" size={20} color={colors.textSubtle} />
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: hitSize + 8,
    borderWidth: StyleSheet.hairlineWidth,
  },
  text: { flex: 1, gap: 2 },
});
