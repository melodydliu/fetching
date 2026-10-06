import { Pressable, StyleSheet, View } from 'react-native';
import { Icon } from '@/components/ui/Icon';
import { PhotoView } from '@/components/ui/PhotoView';
import { Text } from '@/components/ui/Text';
import { useTheme } from '@/hooks/useTheme';

interface LikeCardProps {
  width: number;
  photoUrl: string;
  name: string;
  age: number;
  /** Short "what they liked", e.g. "Your photo" or "Biscuit". */
  target: string;
  comment?: string;
  isTreat: boolean;
  onPress: () => void;
}

/** Portrait tile for the Likes You grid: photo first, details over a bottom scrim. */
export function LikeCard({
  width,
  photoUrl,
  name,
  age,
  target,
  comment,
  isTreat,
  onPress,
}: LikeCardProps) {
  const { colors, radii, spacing, shadows } = useTheme();
  const height = Math.round((width * 4) / 3);
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={[
        `${name}, ${age}`,
        isTreat ? 'sent a Treat' : null,
        `liked ${target}`,
        comment ? `says ${comment}` : null,
      ]
        .filter(Boolean)
        .join(', ')}
      accessibilityHint="Opens their profile"
      style={({ pressed }) => [
        {
          width,
          height,
          borderRadius: radii.lg,
          backgroundColor: colors.surfaceMuted,
          borderWidth: isTreat ? 3 : 0,
          borderColor: colors.primary,
          opacity: pressed ? 0.9 : 1,
        },
        styles.card,
        shadows.card,
        { shadowColor: colors.shadow },
      ]}
    >
      <PhotoView
        url={photoUrl}
        label={`Photo of ${name}`}
        style={{ width: '100%', height: '100%' }}
      />
      <View aria-hidden style={styles.scrim} pointerEvents="none" />
      <View
        aria-hidden
        style={[
          styles.badge,
          {
            top: spacing.sm,
            left: spacing.sm,
            backgroundColor: isTreat ? colors.accent : colors.surface,
            borderRadius: radii.pill,
            paddingHorizontal: spacing.sm,
            paddingVertical: spacing.xs,
          },
        ]}
      >
        <Icon
          name={isTreat ? 'star' : 'heart'}
          size={14}
          color={isTreat ? colors.onAccent : colors.primary}
          filled
        />
        <Text
          variant="caption"
          numberOfLines={1}
          style={{ color: isTreat ? colors.onAccent : colors.text, maxWidth: width - 72 }}
        >
          {isTreat ? 'Treat' : target}
        </Text>
      </View>
      <View style={[styles.info, { padding: spacing.md }]} pointerEvents="none">
        <Text variant="heading" style={styles.onPhoto} numberOfLines={1}>
          {name}, {age}
        </Text>
        {comment ? (
          <Text variant="small" style={styles.onPhoto} numberOfLines={2}>
            “{comment}”
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { overflow: 'hidden' },
  // Dark band so white text stays readable on any photo, in both themes.
  scrim: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '38%',
    backgroundColor: 'rgba(8, 24, 32, 0.62)',
  },
  badge: { position: 'absolute', flexDirection: 'row', alignItems: 'center', gap: 4 },
  info: { position: 'absolute', left: 0, right: 0, bottom: 0, gap: 2 },
  // Over a dark photo scrim in both themes, so a fixed light color is intended here.
  onPhoto: { color: '#FFFFFF' },
});
