import * as Haptics from 'expo-haptics';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { hitSize } from '@/theme';
import { Icon } from './Icon';
import { Text } from './Text';

interface StepperProps {
  label: string;
  value: number;
  onChange: (delta: number) => void;
  canDecrement?: boolean;
  canIncrement?: boolean;
}

/** − value + with 48pt buttons. Announces as an adjustable value for screen readers. */
export function Stepper({
  label,
  value,
  onChange,
  canDecrement = true,
  canIncrement = true,
}: StepperProps) {
  const { colors, radii, spacing } = useTheme();
  const press = (delta: number) => {
    void Haptics.selectionAsync();
    onChange(delta);
  };
  const button = (delta: number, enabled: boolean, icon: 'minus' | 'plus') => (
    <Pressable
      onPress={() => press(delta)}
      disabled={!enabled}
      accessibilityRole="button"
      accessibilityLabel={`${delta < 0 ? 'Decrease' : 'Increase'} ${label}`}
      accessibilityState={{ disabled: !enabled }}
      style={[
        styles.button,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderRadius: radii.pill,
          opacity: enabled ? 1 : 0.4,
        },
      ]}
    >
      <Icon name={icon} size={20} color={colors.text} />
    </Pressable>
  );
  return (
    <View
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={label}
      accessibilityValue={{ text: String(value) }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(e) => {
        if (e.nativeEvent.actionName === 'increment' && canIncrement) press(1);
        if (e.nativeEvent.actionName === 'decrement' && canDecrement) press(-1);
      }}
      style={[styles.row, { gap: spacing.md }]}
    >
      <Text variant="smallStrong" color="textMuted" style={styles.label}>
        {label}
      </Text>
      {button(-1, canDecrement, 'minus')}
      <Text variant="heading" align="center" style={styles.value}>
        {value}
      </Text>
      {button(1, canIncrement, 'plus')}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  label: { flex: 1 },
  button: {
    width: hitSize,
    height: hitSize,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  value: { minWidth: 36 },
});
