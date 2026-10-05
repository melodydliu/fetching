import * as Haptics from 'expo-haptics';
import { Pressable, StyleSheet, View } from 'react-native';
import type { ProfileSection, ProfileSectionKind } from '@/domain/profileBlocks';
import { useTheme } from '@/hooks/useTheme';
import { hitSize } from '@/theme';
import { Icon } from './ui/Icon';
import { Text } from './ui/Text';

interface SectionTabsProps {
  sections: Pick<ProfileSection, 'kind' | 'label'>[];
  active: ProfileSectionKind;
  onSelect: (kind: ProfileSectionKind) => void;
}

/** Sticky "Priya | Pickles" switcher: shows a profile has two parts and jumps between them. */
export function SectionTabs({ sections, active, onSelect }: SectionTabsProps) {
  const { colors, radii, spacing } = useTheme();
  return (
    <View
      accessibilityRole="tablist"
      style={[
        styles.row,
        { backgroundColor: colors.background, paddingVertical: spacing.sm, gap: spacing.sm },
      ]}
    >
      {sections.map((s) => {
        const selected = s.kind === active;
        return (
          <Pressable
            key={s.kind}
            onPress={() => {
              void Haptics.selectionAsync();
              onSelect(s.kind);
            }}
            accessibilityRole="tab"
            accessibilityLabel={s.kind === 'person' ? `About ${s.label}` : `Meet ${s.label}`}
            accessibilityState={{ selected }}
            style={[
              styles.tab,
              {
                backgroundColor: selected ? colors.primary : colors.surface,
                borderColor: selected ? colors.primary : colors.border,
                borderRadius: radii.pill,
                paddingHorizontal: spacing.lg,
              },
            ]}
          >
            <Icon
              name={s.kind === 'person' ? 'user' : 'paw'}
              size={18}
              color={selected ? colors.onPrimary : colors.text}
            />
            <Text variant="smallStrong" color={selected ? 'onPrimary' : 'text'} numberOfLines={1}>
              {s.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row' },
  tab: {
    minHeight: hitSize - 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1.5,
    flexShrink: 1,
  },
});
