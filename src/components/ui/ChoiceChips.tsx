import * as Haptics from 'expo-haptics';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { hitSize } from '@/theme';
import { Text } from './Text';

export interface ChoiceOption<T extends string> {
  value: T;
  label: string;
}

interface ChoiceChipsProps<T extends string> {
  options: readonly ChoiceOption<T>[];
  /** Selected values. Single-select passes a one-item (or empty) array. */
  value: readonly T[];
  onChange: (next: T[]) => void;
  multiple?: boolean;
  /** Describes the group for screen readers, e.g. "Energy level". */
  label: string;
}

/** Pill-shaped chips with 48pt tap targets. Single or multi select. */
export function ChoiceChips<T extends string>({
  options,
  value,
  onChange,
  multiple,
  label,
}: ChoiceChipsProps<T>) {
  const { colors, radii, spacing } = useTheme();
  const press = (v: T) => {
    void Haptics.selectionAsync();
    if (!multiple) return onChange([v]);
    onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v]);
  };
  return (
    <View
      accessibilityRole={multiple ? undefined : 'radiogroup'}
      accessibilityLabel={label}
      style={[styles.wrap, { gap: spacing.sm }]}
    >
      {options.map((o) => {
        const selected = value.includes(o.value);
        return (
          <Pressable
            key={o.value}
            onPress={() => press(o.value)}
            accessibilityRole={multiple ? 'checkbox' : 'radio'}
            accessibilityLabel={o.label}
            accessibilityState={{ selected, checked: selected }}
            style={[
              styles.chip,
              {
                backgroundColor: selected ? colors.primary : colors.surface,
                borderColor: selected ? colors.primary : colors.border,
                borderRadius: radii.pill,
                paddingHorizontal: spacing.lg,
              },
            ]}
          >
            <Text variant="smallStrong" color={selected ? 'onPrimary' : 'text'}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap' },
  chip: { minHeight: hitSize, justifyContent: 'center', borderWidth: 1.5 },
});
