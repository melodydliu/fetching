import { Pressable, Switch, View } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { Text } from './Text';

interface DealbreakerToggleProps {
  value: boolean;
  onChange: (next: boolean) => void;
  /** Nothing is selected, so there's nothing to enforce. */
  disabled?: boolean;
  /** What happens when it's on; read out by screen readers. */
  description?: string;
  /** Names the preference for screen readers. */
  forLabel: string;
}

/**
 * Small inline "Dealbreaker" label + switch for a section heading. The whole cluster is the touch
 * target (the switch itself is shrunk to sit on one line with the title). Off means it only
 * nudges ranking.
 */
export function DealbreakerToggle({
  value,
  onChange,
  disabled,
  description = 'Only show people who match this',
  forLabel,
}: DealbreakerToggleProps) {
  const { colors, spacing } = useTheme();
  const on = value && !disabled;
  return (
    <Pressable
      onPress={() => onChange(!value)}
      disabled={disabled}
      hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
      accessibilityRole="switch"
      accessibilityLabel={`Dealbreaker: ${forLabel}`}
      accessibilityHint={disabled ? 'Pick something first to make this a dealbreaker' : description}
      accessibilityState={{ checked: on, disabled: !!disabled }}
      style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}
    >
      <Text variant="caption" color={disabled ? 'textSubtle' : 'textMuted'}>
        Dealbreaker
      </Text>
      {/* Fixed box: a scaled Switch still reserves its full size, which is what pushed things off. */}
      <View
        pointerEvents="none"
        style={{ width: 38, height: 24, alignItems: 'center', justifyContent: 'center' }}
      >
        <Switch
          value={on}
          disabled={disabled}
          trackColor={{ true: colors.primary, false: colors.border }}
          style={{ transform: [{ scale: 0.75 }] }}
          // Presses go to the wrapper above.
          accessible={false}
          importantForAccessibility="no-hide-descendants"
        />
      </View>
    </Pressable>
  );
}
