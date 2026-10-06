import * as Haptics from 'expo-haptics';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { availableSlots, buildDayOptions, combineDayAndHour } from '@/domain/datePlans';
import { useTheme } from '@/hooks/useTheme';
import { hitSize } from '@/theme';
import { Text } from '../ui/Text';

interface DateTimePickerProps {
  value: Date | null;
  onChange: (next: Date | null) => void;
}

const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();

function dayLabel(day: Date, today: Date): { top: string; bottom: string } {
  const diff = Math.round((day.getTime() - today.getTime()) / 86_400_000);
  const top =
    diff === 0
      ? 'Today'
      : diff === 1
        ? 'Tmrw'
        : day.toLocaleDateString(undefined, { weekday: 'short' });
  return { top, bottom: String(day.getDate()) };
}

/** Day strip + time slots. Plain chips, so it behaves the same on iOS, Android and web. */
export function DateTimePicker({ value, onChange }: DateTimePickerProps) {
  const { colors, radii, spacing } = useTheme();
  const now = useMemo(() => new Date(), []);
  const days = useMemo(() => buildDayOptions(now), [now]);
  const [day, setDay] = useState<Date | null>(value ?? null);
  const slots = day ? availableSlots(day, now) : [];
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);

  const pickDay = (d: Date) => {
    void Haptics.selectionAsync();
    setDay(d);
    // Keep the chosen hour when it still makes sense on the new day.
    const hour = value?.getHours();
    const keep = hour !== undefined && availableSlots(d, now).some((s) => s.hour === hour);
    onChange(keep ? combineDayAndHour(d, hour) : null);
  };

  return (
    <View style={{ gap: spacing.md }}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: spacing.sm }}
        accessibilityLabel="Day"
      >
        {days.map((d) => {
          const selected = !!day && sameDay(d, day);
          const label = dayLabel(d, today);
          return (
            <Pressable
              key={d.toISOString()}
              onPress={() => pickDay(d)}
              accessibilityRole="radio"
              accessibilityLabel={d.toLocaleDateString(undefined, {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
              })}
              accessibilityState={{ selected }}
              style={[
                styles.day,
                {
                  backgroundColor: selected ? colors.primary : colors.surface,
                  borderColor: selected ? colors.primary : colors.border,
                  borderRadius: radii.lg,
                },
              ]}
            >
              <Text variant="caption" color={selected ? 'onPrimary' : 'textMuted'}>
                {label.top}
              </Text>
              <Text variant="bodyStrong" color={selected ? 'onPrimary' : 'text'}>
                {label.bottom}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {day ? (
        <View style={[styles.slots, { gap: spacing.sm }]} accessibilityLabel="Time">
          {slots.map((slot) => {
            const selected = value?.getHours() === slot.hour && sameDay(value, day);
            return (
              <Pressable
                key={slot.hour}
                onPress={() => {
                  void Haptics.selectionAsync();
                  onChange(combineDayAndHour(day, slot.hour));
                }}
                accessibilityRole="radio"
                accessibilityLabel={slot.label}
                accessibilityState={{ selected }}
                style={[
                  styles.slot,
                  {
                    backgroundColor: selected ? colors.primary : colors.surface,
                    borderColor: selected ? colors.primary : colors.border,
                    borderRadius: radii.pill,
                    paddingHorizontal: spacing.lg,
                  },
                ]}
              >
                <Text variant="smallStrong" color={selected ? 'onPrimary' : 'text'}>
                  {slot.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ) : (
        <Text variant="small" color="textSubtle">
          Pick a day to see times.
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  day: {
    width: 64,
    minHeight: 68,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  slots: { flexDirection: 'row', flexWrap: 'wrap' },
  slot: { minHeight: hitSize, justifyContent: 'center', borderWidth: 1.5 },
});
