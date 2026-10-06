import * as Haptics from 'expo-haptics';
import { useEffect, useState } from 'react';
import { PanResponder, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { hitSize } from '@/theme';

export interface Range {
  min: number;
  max: number;
}

/**
 * Where a handle ends up after being dragged `dx` points from where the drag began.
 * Whole numbers only, kept inside [lo, hi], and a handle can't pass the other one.
 */
export function dragRange(
  start: Range,
  end: 'min' | 'max',
  dx: number,
  trackWidth: number,
  lo: number,
  hi: number,
): Range {
  if (trackWidth <= 0) return start;
  const moved = Math.round(start[end] + (dx / trackWidth) * (hi - lo));
  if (end === 'min') return { ...start, min: Math.min(Math.max(moved, lo), start.max) };
  return { ...start, max: Math.max(Math.min(moved, hi), start.min) };
}

/** Moves one handle by whole steps (used by screen-reader actions), same limits as dragging. */
export function stepRange(value: Range, end: 'min' | 'max', delta: number, lo: number, hi: number) {
  if (end === 'min') return { ...value, min: Math.min(Math.max(value.min + delta, lo), value.max) };
  return { ...value, max: Math.max(Math.min(value.max + delta, hi), value.min) };
}

interface RangeSliderProps {
  /** Screen-reader names for the two handles, e.g. "Youngest age" / "Oldest age". */
  minLabel: string;
  maxLabel: string;
  lo: number;
  hi: number;
  value: Range;
  onChange: (next: Range) => void;
  /**
   * True while a finger is on the slider. A screen can use it to switch off the swipe-back
   * gesture, which would otherwise fight the handles for the same horizontal drag.
   */
  onTouchingChange?: (touching: boolean) => void;
}

const THUMB = 28;

/** Two-handle slider for a range (like an age range). Each handle is also adjustable by assistive tech. */
export function RangeSlider({
  minLabel,
  maxLabel,
  lo,
  hi,
  value,
  onChange,
  onTouchingChange,
}: RangeSliderProps) {
  const { colors } = useTheme();
  const [width, setWidth] = useState(0);
  const usable = Math.max(width - THUMB, 0);

  // Drag handlers are created once; they read the newest props through this ref.
  const [latestRef] = useState({ current: { value, onChange, usable, lo, hi } });
  useEffect(() => {
    latestRef.current = { value, onChange, usable, lo, hi };
  });

  // The handlers only read latestRef while a finger is moving (never during render), which the
  // React Compiler lint can't see.
  /* eslint-disable react-hooks/refs */
  const [thumbs] = useState(() => {
    const make = (end: 'min' | 'max') => {
      let start: Range = { min: 0, max: 0 };
      return PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        // Keep the drag even when the page is a scroll view.
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: () => {
          start = latestRef.current.value;
        },
        onPanResponderMove: (_e, g) => {
          const l = latestRef.current;
          const next = dragRange(start, end, g.dx, l.usable, l.lo, l.hi);
          if (next.min !== l.value.min || next.max !== l.value.max) {
            void Haptics.selectionAsync();
            l.onChange(next);
          }
        },
      });
    };
    return { min: make('min'), max: make('max') };
  });
  /* eslint-enable react-hooks/refs */

  const x = (v: number) => THUMB / 2 + ((v - lo) / (hi - lo)) * usable;
  const step = (end: 'min' | 'max', delta: number) => {
    const next = stepRange(value, end, delta, lo, hi);
    if (next.min !== value.min || next.max !== value.max) {
      void Haptics.selectionAsync();
      onChange(next);
    }
  };

  // When both handles sit on the same number, the one that can still move stays on top.
  const minOnTop = value.min === value.max && value.min > (lo + hi) / 2;

  const handle = (end: 'min' | 'max', label: string) => (
    <View
      key={end}
      {...thumbs[end].panHandlers}
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={label}
      accessibilityValue={{ min: lo, max: hi, now: value[end], text: String(value[end]) }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(e) => {
        if (e.nativeEvent.actionName === 'increment') step(end, 1);
        if (e.nativeEvent.actionName === 'decrement') step(end, -1);
      }}
      style={[
        styles.hit,
        { left: x(value[end]) - hitSize / 2, zIndex: (end === 'min') === minOnTop ? 2 : 1 },
      ]}
    >
      <View
        style={[
          styles.thumb,
          {
            backgroundColor: colors.surface,
            borderColor: colors.primary,
            shadowColor: colors.text,
          },
        ]}
      />
    </View>
  );

  return (
    <View
      onTouchStart={() => onTouchingChange?.(true)}
      onTouchEnd={() => onTouchingChange?.(false)}
      onTouchCancel={() => onTouchingChange?.(false)}
      style={styles.wrap}
      onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}
    >
      <View
        style={[
          styles.track,
          { backgroundColor: colors.border, left: THUMB / 2, right: THUMB / 2 },
        ]}
      />
      <View
        style={[
          styles.track,
          {
            backgroundColor: colors.primary,
            left: x(value.min),
            width: x(value.max) - x(value.min),
          },
        ]}
      />
      {handle('min', minLabel)}
      {handle('max', maxLabel)}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { height: hitSize, justifyContent: 'center' },
  track: { position: 'absolute', height: 4, borderRadius: 2 },
  hit: {
    position: 'absolute',
    width: hitSize,
    height: hitSize,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumb: {
    width: THUMB,
    height: THUMB,
    borderRadius: THUMB / 2,
    borderWidth: 3,
    shadowOpacity: 0.15,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
});
