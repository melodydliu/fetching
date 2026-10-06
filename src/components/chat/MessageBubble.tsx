import { StyleSheet, View } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { Text } from '../ui/Text';

interface MessageBubbleProps {
  text: string;
  mine: boolean;
  time: string;
}

export function MessageBubble({ text, mine, time }: MessageBubbleProps) {
  const { colors, radii, spacing } = useTheme();
  return (
    <View
      accessible
      accessibilityLabel={`${mine ? 'You' : 'Them'}, ${time}: ${text}`}
      style={[styles.row, { justifyContent: mine ? 'flex-end' : 'flex-start' }]}
    >
      <View
        style={{
          maxWidth: '80%',
          backgroundColor: mine ? colors.primary : colors.surface,
          borderColor: mine ? colors.primary : colors.border,
          borderWidth: StyleSheet.hairlineWidth,
          borderRadius: radii.lg,
          borderBottomRightRadius: mine ? radii.sm : radii.lg,
          borderBottomLeftRadius: mine ? radii.lg : radii.sm,
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.sm + 2,
        }}
      >
        <Text color={mine ? 'onPrimary' : 'text'}>{text}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({ row: { flexDirection: 'row' } });
