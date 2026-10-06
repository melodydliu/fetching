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

/** Friendly dead-end replacement. Always offers a way forward when one exists. */
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
  return (
    <View style={[styles.wrap, { gap: spacing.md, paddingHorizontal: spacing.lg }]}>
      <Illustration name={illustration} />
      <Text variant="titleItalic" align="center">
        {title}
      </Text>
      <Text variant="body" color="textMuted" align="center">
        {body}
      </Text>
      {actionLabel && onAction && (
        <Button
          label={actionLabel}
          onPress={onAction}
          style={{ alignSelf: 'stretch', marginTop: spacing.sm }}
        />
      )}
      {secondaryLabel && onSecondary && (
        <Button label={secondaryLabel} onPress={onSecondary} variant="ghost" />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
