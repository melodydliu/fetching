import { useState } from 'react';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { hitSize } from '@/theme';
import { Icon } from './Icon';
import { Text } from './Text';

interface InfoTipProps {
  /** Names the button for screen readers, e.g. "About preferences". */
  label: string;
  text: string;
}

/** An ⓘ button that opens a small card of explanation under it; tap the button or the card to close. */
export function InfoTip({ label, text }: InfoTipProps) {
  const { colors, radii, shadows, spacing } = useTheme();
  const { width: windowWidth } = useWindowDimensions();
  const [open, setOpen] = useState(false);
  // Right-aligned under the button, as wide as the screen's gutters allow (a percentage would
  // resolve against the 48pt button).
  const cardWidth = Math.min(340, windowWidth - spacing.lg * 2);
  return (
    <View style={styles.anchor}>
      <Pressable
        onPress={() => setOpen((o) => !o)}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ expanded: open }}
        style={styles.button}
      >
        <Icon name="info" size={24} color={open ? colors.primary : colors.textMuted} />
      </Pressable>
      {open ? (
        <Pressable
          onPress={() => setOpen(false)}
          accessibilityRole="button"
          accessibilityLabel={`${text} Tap to close.`}
          style={[
            styles.card,
            shadows.card,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              borderRadius: radii.lg,
              padding: spacing.lg,
              width: cardWidth,
              shadowColor: colors.shadow,
            },
          ]}
        >
          <Text variant="small" color="textMuted">
            {text}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  // Raised above the content that follows the header so the card overlays it.
  anchor: { zIndex: 10, elevation: 10 },
  button: { width: hitSize, height: hitSize, alignItems: 'center', justifyContent: 'center' },
  card: {
    position: 'absolute',
    top: hitSize,
    right: 0,
    borderWidth: StyleSheet.hairlineWidth,
  },
});
