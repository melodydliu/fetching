import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/hooks/useTheme';
import { Button } from './ui/Button';
import { Text } from './ui/Text';

interface SaveBarProps {
  dirty: boolean;
  /** What blocks saving (shown only once something has changed). */
  problem?: string | null;
  saving?: boolean;
  onSave: () => void;
  label?: string;
}

/** Pinned "Save changes" button for draft-and-save screens. Disabled until there's something to save. */
export function SaveBar({ dirty, problem, saving, onSave, label = 'Save changes' }: SaveBarProps) {
  const { colors, spacing } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View
      style={{
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.md,
        paddingBottom: Math.max(insets.bottom, spacing.md),
        gap: spacing.xs,
        borderTopWidth: 1,
        borderTopColor: colors.border,
        backgroundColor: colors.background,
      }}
    >
      {dirty && problem ? (
        <Text variant="small" color="danger" accessibilityLiveRegion="polite">
          {problem}
        </Text>
      ) : null}
      <Button
        label={label}
        icon="check"
        onPress={onSave}
        disabled={!dirty || !!problem}
        loading={saving}
      />
    </View>
  );
}
