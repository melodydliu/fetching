import { useEffect } from 'react';
import type { DimensionValue, ViewStyle } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useTheme } from '@/hooks/useTheme';

interface SkeletonProps {
  width?: DimensionValue;
  height: number;
  radius?: number;
  style?: ViewStyle;
}

/** Pulsing placeholder block for real loading states. Holds still when reduce-motion is on. */
export function Skeleton({ width = '100%', height, radius, style }: SkeletonProps) {
  const { colors, radii } = useTheme();
  const reduceMotion = useReducedMotion();
  const opacity = useSharedValue(1);

  useEffect(() => {
    if (reduceMotion) return;
    opacity.value = withRepeat(
      withTiming(0.5, { duration: 800, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  }, [opacity, reduceMotion]);

  const animated = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return (
    <Animated.View
      aria-hidden
      style={[
        { width, height, borderRadius: radius ?? radii.md, backgroundColor: colors.surfaceMuted },
        animated,
        style,
      ]}
    />
  );
}
