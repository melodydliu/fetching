import { StyleSheet, View } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { Illustration, type IllustrationName } from '../illustrations/Illustration';
import { Button } from './Button';
import { Text } from './Text';

interface EmptyStateProps {
  illustration: IllustrationName;
  title: string;
  body: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
}

/**
 * Friendly dead-end replacement. Always offers a way forward when one exists. Fills the space it
 * is given (give it a parent with flex: 1), so the buttons land at the bottom of the screen.
 */
export function EmptyState({
  illustration,
  title,
  body,
  actionLabel,
  onAction,
  secondaryLabel,
  onSecondary,
}: EmptyStateProps) {
  const { spacing } = useTheme();
  const hasActions = !!(actionLabel && onAction) || !!(secondaryLabel && onSecondary);
  return (
    <View style={styles.wrap}>
      <View style={[styles.content, { gap: spacing.md, paddingHorizontal: spacing.lg }]}>
        <Illustration name={illustration} />
        <Text variant="titleItalic" align="center">
          {title}
        </Text>
        <Text variant="body" color="textMuted" align="center">
          {body}
        </Text>
      </View>
      {hasActions && (
        <View style={{ gap: spacing.xs, paddingTop: spacing.md }}>
          {actionLabel && onAction && <Button label={actionLabel} onPress={onAction} />}
          {secondaryLabel && onSecondary && (
            <Button label={secondaryLabel} onPress={onSecondary} variant="ghost" />
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  // Picture and words sit in the middle of the space; buttons are pinned to the bottom.
  wrap: { flex: 1 },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
