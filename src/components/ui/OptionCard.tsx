import * as Haptics from 'expo-haptics';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { hitSize } from '@/theme';
import { Icon } from './Icon';
import { Text } from './Text';

interface OptionCardProps {
  title: string;
  subtitle?: string;
  selected: boolean;
  onPress: () => void;
  /** `checkbox` for multi-select lists, `radio` for single choice. */
  role?: 'radio' | 'checkbox';
  leading?: ReactNode;
}

/** Big, forgiving selectable row: the workhorse of one-question-per-screen onboarding. */
export function OptionCard({
  title,
  subtitle,
  selected,
  onPress,
  role = 'radio',
  leading,
}: OptionCardProps) {
  const { colors, radii, spacing } = useTheme();
  return (
    <Pressable
      onPress={() => {
        void Haptics.selectionAsync();
        onPress();
      }}
      accessibilityRole={role}
      accessibilityLabel={subtitle ? `${title}, ${subtitle}` : title}
      accessibilityState={{ selected, checked: selected }}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: selected ? colors.primarySoft : colors.surface,
          borderColor: selected ? colors.primary : colors.border,
          borderRadius: radii.lg,
          padding: spacing.lg,
          gap: spacing.md,
          opacity: pressed ? 0.9 : 1,
        },
      ]}
    >
      {leading}
      <View style={styles.text}>
        <Text variant="bodyStrong" color={selected ? 'onPrimarySoft' : 'text'}>
          {title}
        </Text>
        {subtitle ? (
          <Text variant="small" color={selected ? 'onPrimarySoft' : 'textMuted'}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      <View
        style={[
          styles.mark,
          {
            borderColor: selected ? colors.primary : colors.border,
            backgroundColor: selected ? colors.primary : 'transparent',
            borderRadius: role === 'radio' ? 12 : 8,
          },
        ]}
      >
        {selected ? <Icon name="check" size={16} color={colors.onPrimary} /> : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', minHeight: hitSize + 16, borderWidth: 1.5 },
  text: { flex: 1, gap: 2 },
  mark: { width: 24, height: 24, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
});
