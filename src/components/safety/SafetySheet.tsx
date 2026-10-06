import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { REPORT_REASONS } from '@/config/reference';
import type { ID, ReportReason } from '@/domain/types';
import { useSafetyActions } from '@/hooks/safetyActions';
import { useTheme } from '@/hooks/useTheme';
import { hitSize } from '@/theme';
import { confirmAction } from '@/utils/confirm';
import { Button } from '../ui/Button';
import { ChoiceChips } from '../ui/ChoiceChips';
import { Text } from '../ui/Text';
import { TextField } from '../ui/TextField';

export type SafetyOutcome = 'unmatched' | 'blocked' | 'reported';

interface SafetySheetProps {
  visible: boolean;
  userId: ID;
  name: string;
  /** Present when you're matched, which adds Unmatch. */
  matchId?: ID;
  onClose: () => void;
  /** Called after an action succeeds, so the screen can leave or move on. */
  onDone?: (outcome: SafetyOutcome) => void;
}

const MAX_DETAILS = 300;

/** Unmatch / Block / Report for one person, from a chat or a profile. */
export function SafetySheet({ visible, userId, name, matchId, onClose, onDone }: SafetySheetProps) {
  const { colors, radii, spacing } = useTheme();
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const { unmatch, block, report } = useSafetyActions();
  const [step, setStep] = useState<'menu' | 'report'>('menu');
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [details, setDetails] = useState('');
  const [alsoBlock, setAlsoBlock] = useState(false);

  const close = () => {
    setStep('menu');
    setReason(null);
    setDetails('');
    setAlsoBlock(false);
    onClose();
  };
  const done = (outcome: SafetyOutcome) => {
    close();
    onDone?.(outcome);
  };

  const confirmUnmatch = () =>
    confirmAction({
      title: `Unmatch with ${name}?`,
      message: 'The chat is deleted for you both. This can’t be undone.',
      confirmLabel: 'Unmatch',
      destructive: true,
      onConfirm: () => unmatch.mutate(matchId!, { onSuccess: () => done('unmatched') }),
    });

  const confirmBlock = () =>
    confirmAction({
      title: `Block ${name}?`,
      message: 'You won’t see each other anywhere, and any chat or match is removed.',
      confirmLabel: 'Block',
      destructive: true,
      onConfirm: () => block.mutate(userId, { onSuccess: () => done('blocked') }),
    });

  const submitReport = () => {
    if (!reason) return;
    report.mutate(
      { reportedId: userId, reason, details: details.trim() || undefined },
      {
        onSuccess: () => {
          if (alsoBlock) {
            block.mutate(userId, { onSuccess: () => done('blocked') });
          } else {
            done('reported');
          }
        },
      },
    );
  };

  const row = (label: string, subtitle: string, onPress: () => void, danger = false) => (
    <Pressable
      key={label}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={subtitle}
      style={({ pressed }) => [
        styles.row,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderRadius: radii.lg,
          padding: spacing.md,
          opacity: pressed ? 0.85 : 1,
        },
      ]}
    >
      <Text variant="bodyStrong" color={danger ? 'danger' : 'text'}>
        {label}
      </Text>
      <Text variant="small" color="textMuted">
        {subtitle}
      </Text>
    </Pressable>
  );

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={close}>
      <View style={[styles.backdrop, { backgroundColor: colors.overlay }]}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={close}
          accessibilityRole="button"
          accessibilityLabel="Close"
        />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View
            style={{
              // A pixel cap: a percentage resolves against content-sized parents and clips on web.
              maxHeight: windowHeight * 0.9,
              backgroundColor: colors.background,
              borderTopLeftRadius: radii.xl,
              borderTopRightRadius: radii.xl,
            }}
          >
            <ScrollView
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{
                padding: spacing.lg,
                paddingBottom: insets.bottom + spacing.lg,
                gap: spacing.md,
              }}
            >
              {step === 'menu' ? (
                <>
                  <Text variant="title">{name}</Text>
                  {matchId
                    ? row(
                        'Unmatch',
                        'Remove them from your matches and delete the chat.',
                        confirmUnmatch,
                        true,
                      )
                    : null}
                  {row(
                    `Block ${name}`,
                    'You won’t see each other anywhere in the app.',
                    confirmBlock,
                    true,
                  )}
                  {row(`Report ${name}`, 'Tell us what’s wrong. Reports are private.', () =>
                    setStep('report'),
                  )}
                  <Button label="Cancel" variant="ghost" onPress={close} />
                </>
              ) : (
                <>
                  <Text variant="title">Report {name}</Text>
                  <Text color="textMuted">What’s going on? They won’t be told it was you.</Text>
                  <ChoiceChips
                    label="Reason"
                    options={REPORT_REASONS}
                    value={reason ? [reason] : []}
                    onChange={([next]) => setReason(next ?? null)}
                  />
                  <TextField
                    label="Anything else we should know? (optional)"
                    value={details}
                    onChangeText={setDetails}
                    maxLength={MAX_DETAILS}
                    multiline
                  />
                  <View style={[styles.switchRow, { gap: spacing.md }]}>
                    <Text style={styles.flex}>Also block {name}</Text>
                    <Switch
                      value={alsoBlock}
                      onValueChange={setAlsoBlock}
                      trackColor={{ true: colors.primary, false: colors.border }}
                      accessibilityLabel={`Also block ${name}`}
                    />
                  </View>
                  <Button
                    label="Submit report"
                    onPress={submitReport}
                    disabled={!reason}
                    loading={report.isPending || block.isPending}
                  />
                  <Button label="Back" variant="ghost" onPress={() => setStep('menu')} />
                </>
              )}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end' },
  row: { minHeight: hitSize + 8, borderWidth: StyleSheet.hairlineWidth, gap: 2 },
  switchRow: { flexDirection: 'row', alignItems: 'center', minHeight: hitSize },
  flex: { flex: 1 },
});
