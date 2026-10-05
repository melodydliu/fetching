import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useTheme } from '@/hooks/useTheme';

/** Thin animated progress bar. `progress` is 0–1. */
export function ProgressBar({ progress }: { progress: number }) {
  const { colors } = useTheme();
  const width = useSharedValue(progress);
  useEffect(() => {
    width.value = withTiming(progress, { duration: 280 });
  }, [progress, width]);
  const fill = useAnimatedStyle(() => ({ width: `${Math.max(0.04, width.value) * 100}%` }));
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(progress * 100) }}
      style={{
        height: 6,
        borderRadius: 3,
        backgroundColor: colors.surfaceMuted,
        overflow: 'hidden',
      }}
    >
      <Animated.View
        style={[{ height: 6, borderRadius: 3, backgroundColor: colors.primary }, fill]}
      />
    </View>
  );
}
