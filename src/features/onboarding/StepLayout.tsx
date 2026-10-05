import type { ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Text } from '@/components/ui/Text';
import { useTheme } from '@/hooks/useTheme';
import { hitSize } from '@/theme';

interface StepLayoutProps {
  title: string;
  subtitle?: string;
  progress: number;
  onBack?: () => void;
  primaryLabel?: string;
  onPrimary: () => void;
  primaryDisabled?: boolean;
  primaryLoading?: boolean;
  /** Shown as a quiet "Skip for now" link under the primary button. */
  onSkip?: () => void;
  children: ReactNode;
}

/** One question per screen: progress bar on top, one clear primary action at the bottom. */
export function StepLayout({
  title,
  subtitle,
  progress,
  onBack,
  primaryLabel = 'Continue',
  onPrimary,
  primaryDisabled,
  primaryLoading,
  onSkip,
  children,
}: StepLayoutProps) {
  const { colors, spacing } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.flex, { backgroundColor: colors.background }]}
    >
      <View style={{ paddingTop: insets.top + spacing.sm, paddingHorizontal: spacing.lg }}>
        <View style={[styles.top, { gap: spacing.md }]}>
          <View style={styles.backSlot}>
            {onBack && (
              <Pressable
                onPress={onBack}
                accessibilityRole="button"
                accessibilityLabel="Back"
                style={styles.back}
              >
                <Icon name="chevron-left" color={colors.text} />
              </Pressable>
            )}
          </View>
          <View style={styles.flex}>
            <ProgressBar progress={progress} />
          </View>
        </View>
      </View>

      <ScrollView
        style={styles.flex}
        contentContainerStyle={{ padding: spacing.lg, paddingTop: spacing.xl, gap: spacing.xl }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={{ gap: spacing.sm }}>
          <Text variant="display" style={{ fontSize: 30, lineHeight: 36 }}>
            {title}
          </Text>
          {subtitle ? (
            <Text variant="body" color="textMuted">
              {subtitle}
            </Text>
          ) : null}
        </View>
        {children}
      </ScrollView>

      <View
        style={{
          paddingHorizontal: spacing.lg,
          paddingTop: spacing.md,
          paddingBottom: Math.max(insets.bottom, spacing.lg),
          gap: spacing.xs,
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: colors.border,
          backgroundColor: colors.background,
        }}
      >
        <Button
          label={primaryLabel}
          onPress={onPrimary}
          disabled={primaryDisabled}
          loading={primaryLoading}
        />
        {onSkip && <Button label="Skip for now" variant="ghost" onPress={onSkip} haptic={false} />}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  top: { flexDirection: 'row', alignItems: 'center' },
  backSlot: { width: hitSize, height: hitSize, marginLeft: -12 },
  back: { width: hitSize, height: hitSize, alignItems: 'center', justifyContent: 'center' },
});
