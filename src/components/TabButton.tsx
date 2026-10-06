import { forwardRef } from 'react';
import { Pressable, StyleSheet, View, type PressableProps } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { hitSize } from '@/theme';
import { Icon, type IconName } from './ui/Icon';
import { Text } from './ui/Text';

type TabButtonProps = PressableProps & {
  icon: IconName;
  label: string;
  /** Number shown as a dot-badge. Zero or undefined hides it. */
  badge?: number;
  /** Injected by `TabTrigger asChild`. */
  isFocused?: boolean;
};

export const TabButton = forwardRef<View, TabButtonProps>(function TabButton(
  { icon, label, badge, isFocused, ...rest },
  ref,
) {
  const { colors, radii, spacing } = useTheme();
  const fg = isFocused ? colors.onPrimary : colors.textMuted;
  const badgeText = badge && badge > 0 ? (badge > 9 ? '9+' : String(badge)) : null;

  return (
    <Pressable
      ref={ref}
      {...rest}
      accessibilityRole="tab"
      accessibilityLabel={badgeText ? `${label}, ${badge} new` : label}
      accessibilityState={{ selected: !!isFocused }}
      style={[
        styles.base,
        {
          backgroundColor: isFocused ? colors.primary : 'transparent',
          borderRadius: radii.pill,
          paddingHorizontal: spacing.md,
          flexGrow: 1,
        },
      ]}
    >
      <View>
        <Icon
          name={icon}
          size={24}
          color={fg}
          filled={isFocused && icon !== 'paw' && icon !== 'user' && icon !== 'cards'}
        />
        {badgeText && !isFocused ? (
          <View
            style={[styles.badge, { backgroundColor: colors.accent, borderColor: colors.surface }]}
          >
            <Text
              variant="caption"
              style={{ color: colors.onAccent, fontSize: 10, lineHeight: 12 }}
            >
              {badgeText}
            </Text>
          </View>
        ) : null}
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  base: {
    height: hitSize + 4,
    minWidth: hitSize + 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  badge: {
    position: 'absolute',
    top: -6,
    right: -9,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
});
