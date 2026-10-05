import * as Haptics from 'expo-haptics';
import { useLayoutEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  type SharedValue,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { moveItem } from '@/domain/list';
import type { Photo } from '@/domain/types';
import { useTheme } from '@/hooks/useTheme';
import { Icon } from './ui/Icon';
import { PhotoView } from './ui/PhotoView';
import { Text } from './ui/Text';

const GAP = 8;
const COLUMNS = 3;

interface Geometry {
  tileW: number;
  tileH: number;
  rows: number;
}

const slotX = (g: Geometry, i: number) => (i % COLUMNS) * (g.tileW + GAP);
const slotY = (g: Geometry, i: number) => Math.floor(i / COLUMNS) * (g.tileH + GAP);

interface PhotoGridProps {
  photos: Photo[];
  /** Total slots shown (usually 6 for people, more for pets). */
  max: number;
  onChange: (photos: Photo[]) => void;
  onAddPress: () => void;
  adding?: boolean;
  /** Singular noun for screen readers, e.g. "photo". */
  noun?: string;
  /** Hide Remove once this many photos remain (e.g. the 3-photo minimum when editing). */
  minToKeep?: number;
}

/**
 * Photo slots you can long-press and drag to reorder (first photo is the main one).
 * Every tile also exposes Move earlier / Move later / Remove as accessibility actions.
 */
export function PhotoGrid({
  photos,
  max,
  onChange,
  onAddPress,
  adding,
  noun = 'photo',
  minToKeep = 0,
}: PhotoGridProps) {
  const { colors, radii } = useTheme();
  const [width, setWidth] = useState(0);
  const activeIndex = useSharedValue(-1);
  const hoverIndex = useSharedValue(-1);

  const tileW = width > 0 ? (width - GAP * (COLUMNS - 1)) / COLUMNS : 0;
  const geometry: Geometry = { tileW, tileH: (tileW * 4) / 3, rows: Math.ceil(max / COLUMNS) };
  const height = geometry.rows * (geometry.tileH + GAP) - GAP;

  const reorder = (from: number, to: number) => {
    if (from !== to) {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      onChange(moveItem(photos, from, to));
    }
    activeIndex.set(-1);
    hoverIndex.set(-1);
  };

  const remove = (id: string) => onChange(photos.filter((p) => p.id !== id));

  return (
    <View
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      style={{ height: Math.max(0, height) }}
    >
      {width > 0 &&
        Array.from({ length: max }, (_, i) => {
          const photo = photos[i];
          const frame = {
            position: 'absolute' as const,
            left: slotX(geometry, i),
            top: slotY(geometry, i),
            width: tileW,
            height: geometry.tileH,
          };
          if (photo) return null;
          if (i === photos.length) {
            return (
              <Pressable
                key={`add-${i}`}
                onPress={onAddPress}
                disabled={adding}
                accessibilityRole="button"
                accessibilityLabel={`Add ${noun}`}
                style={[
                  frame,
                  styles.empty,
                  {
                    borderColor: colors.primary,
                    backgroundColor: colors.primarySoft,
                    borderRadius: radii.md,
                  },
                ]}
              >
                {adding ? (
                  <ActivityIndicator color={colors.primary} />
                ) : (
                  <Icon name="plus" size={28} color={colors.primary} />
                )}
              </Pressable>
            );
          }
          return (
            <View
              key={`empty-${i}`}
              aria-hidden
              style={[frame, styles.empty, { borderColor: colors.border, borderRadius: radii.md }]}
            />
          );
        })}
      {width > 0 &&
        photos.map((photo, i) => (
          <DraggableTile
            key={photo.id}
            photo={photo}
            index={i}
            count={photos.length}
            geometry={geometry}
            activeIndex={activeIndex}
            hoverIndex={hoverIndex}
            onReorder={reorder}
            onRemove={() => remove(photo.id)}
            noun={noun}
            canRemove={photos.length > minToKeep}
          />
        ))}
    </View>
  );
}

interface TileProps {
  photo: Photo;
  index: number;
  count: number;
  geometry: Geometry;
  activeIndex: SharedValue<number>;
  hoverIndex: SharedValue<number>;
  onReorder: (from: number, to: number) => void;
  onRemove: () => void;
  noun: string;
  canRemove: boolean;
}

function DraggableTile({
  photo,
  index,
  count,
  geometry,
  activeIndex,
  hoverIndex,
  onReorder,
  onRemove,
  noun,
  canRemove,
}: TileProps) {
  const { colors, radii } = useTheme();
  const dx = useSharedValue(0);
  const dy = useSharedValue(0);
  const { tileW, tileH, rows } = geometry;

  // After a reorder this tile has a new index (and a new home slot): drop any leftover offset.
  useLayoutEffect(() => {
    dx.set(0);
    dy.set(0);
  }, [index, dx, dy]);

  // Make room while another tile is dragged over us.
  useAnimatedReaction(
    () => [activeIndex.get(), hoverIndex.get()],
    ([active, hover]) => {
      if (active === index) return;
      let target = index;
      if (active !== undefined && active >= 0 && hover !== undefined && hover >= 0) {
        if (active < hover && index > active && index <= hover) target = index - 1;
        else if (active > hover && index < active && index >= hover) target = index + 1;
      }
      const toX = (target % COLUMNS) * (tileW + GAP) - (index % COLUMNS) * (tileW + GAP);
      const toY =
        Math.floor(target / COLUMNS) * (tileH + GAP) - Math.floor(index / COLUMNS) * (tileH + GAP);
      dx.set(withSpring(toX, { damping: 20, stiffness: 220 }));
      dy.set(withSpring(toY, { damping: 20, stiffness: 220 }));
    },
  );

  const pan = Gesture.Pan()
    .activateAfterLongPress(250)
    .onStart(() => {
      activeIndex.set(index);
      hoverIndex.set(index);
    })
    .onUpdate((e) => {
      dx.set(e.translationX);
      dy.set(e.translationY);
      const cx = (index % COLUMNS) * (tileW + GAP) + tileW / 2 + e.translationX;
      const cy = Math.floor(index / COLUMNS) * (tileH + GAP) + tileH / 2 + e.translationY;
      const col = Math.max(0, Math.min(COLUMNS - 1, Math.floor(cx / (tileW + GAP))));
      const row = Math.max(0, Math.min(rows - 1, Math.floor(cy / (tileH + GAP))));
      hoverIndex.set(Math.max(0, Math.min(count - 1, row * COLUMNS + col)));
    })
    .onEnd(() => {
      const to = hoverIndex.get() < 0 ? index : hoverIndex.get();
      const toX = (to % COLUMNS) * (tileW + GAP) - (index % COLUMNS) * (tileW + GAP);
      const toY =
        Math.floor(to / COLUMNS) * (tileH + GAP) - Math.floor(index / COLUMNS) * (tileH + GAP);
      dx.set(withTiming(toX, { duration: 140 }));
      dy.set(
        withTiming(toY, { duration: 140 }, (finished) => {
          if (finished) scheduleOnRN(onReorder, index, to);
        }),
      );
    })
    .onFinalize((_e, success) => {
      // Cancelled (e.g. long-press released without moving): settle back.
      if (!success && activeIndex.value === index) {
        dx.set(withSpring(0));
        dy.set(withSpring(0));
        activeIndex.set(-1);
        hoverIndex.set(-1);
      }
    });

  const animated = useAnimatedStyle(() => {
    const lifted = activeIndex.value === index;
    return {
      transform: [{ translateX: dx.get() }, { translateY: dy.get() }, { scale: lifted ? 1.06 : 1 }],
      zIndex: lifted ? 20 : 1,
      shadowOpacity: lifted ? 0.3 : 0,
    };
  });

  const position = `${index + 1} of ${count}`;
  return (
    <GestureDetector gesture={pan}>
      <Animated.View
        accessible
        accessibilityLabel={`${noun} ${position}${index === 0 ? ', main' : ''}`}
        accessibilityHint="Long-press and drag to reorder"
        accessibilityActions={[
          ...(index > 0 ? [{ name: 'moveEarlier', label: 'Move earlier' }] : []),
          ...(index < count - 1 ? [{ name: 'moveLater', label: 'Move later' }] : []),
          ...(canRemove ? [{ name: 'remove', label: `Remove ${noun}` }] : []),
        ]}
        onAccessibilityAction={(e) => {
          if (e.nativeEvent.actionName === 'moveEarlier') onReorder(index, index - 1);
          if (e.nativeEvent.actionName === 'moveLater') onReorder(index, index + 1);
          if (e.nativeEvent.actionName === 'remove' && canRemove) onRemove();
        }}
        style={[
          {
            position: 'absolute',
            left: (index % COLUMNS) * (tileW + GAP),
            top: Math.floor(index / COLUMNS) * (tileH + GAP),
            width: tileW,
            height: tileH,
            borderRadius: radii.md,
            shadowColor: colors.shadow,
            shadowOffset: { width: 0, height: 8 },
            shadowRadius: 12,
            backgroundColor: colors.surfaceMuted,
          },
          animated,
        ]}
      >
        <View style={[StyleSheet.absoluteFill, { borderRadius: radii.md, overflow: 'hidden' }]}>
          <PhotoView
            url={photo.url}
            label={`${noun} ${position}`}
            style={{ width: tileW, height: tileH }}
          />
        </View>
        {index === 0 && (
          <View style={[styles.badge, { backgroundColor: colors.accent }]}>
            <Text variant="caption" color="onAccent">
              Main
            </Text>
          </View>
        )}
        {canRemove && (
          <Pressable
            onPress={onRemove}
            hitSlop={11}
            accessibilityRole="button"
            accessibilityLabel={`Remove ${noun} ${position}`}
            style={[styles.remove, { backgroundColor: colors.surface, borderColor: colors.border }]}
          >
            <Icon name="x" size={14} color={colors.text} />
          </Pressable>
        )}
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  empty: { borderWidth: 2, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center' },
  badge: {
    position: 'absolute',
    left: 6,
    bottom: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  remove: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
