import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useTheme } from '@/hooks/useTheme';

function Dot({ delay, still }: { delay: number; still: boolean }) {
  const { colors } = useTheme();
  const lift = useSharedValue(0);

  useEffect(() => {
    if (still) return;
    lift.set(
      withDelay(
        delay,
        withRepeat(
          withSequence(
            withTiming(1, { duration: 300, easing: Easing.out(Easing.ease) }),
            withTiming(0, { duration: 300, easing: Easing.in(Easing.ease) }),
            withTiming(0, { duration: 300 }),
          ),
          -1,
        ),
      ),
    );
  }, [delay, lift, still]);

  const animated = useAnimatedStyle(() => ({
    opacity: 0.45 + lift.get() * 0.55,
    transform: [{ translateY: -3 * lift.get() }],
  }));
  return <Animated.View style={[styles.dot, { backgroundColor: colors.textMuted }, animated]} />;
}

/** Three bouncing dots in a "their" bubble. Holds still when reduce-motion is on. */
export function TypingIndicator({ name }: { name: string }) {
  const { colors, radii, spacing } = useTheme();
  const reduceMotion = useReducedMotion();
  return (
    <View
      accessible
      accessibilityRole="text"
      accessibilityLiveRegion="polite"
      accessibilityLabel={`${name} is typing`}
      style={styles.row}
    >
      <View
        style={{
          flexDirection: 'row',
          gap: 5,
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderWidth: StyleSheet.hairlineWidth,
          borderRadius: radii.lg,
          borderBottomLeftRadius: radii.sm,
          paddingHorizontal: spacing.lg,
          paddingVertical: spacing.md + 2,
        }}
      >
        {[0, 150, 300].map((d) => (
          <Dot key={d} delay={d} still={reduceMotion} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row' },
  dot: { width: 8, height: 8, borderRadius: 4 },
});
