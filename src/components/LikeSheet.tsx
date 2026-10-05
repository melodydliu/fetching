import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { LikeQuota } from '@/services';
import { useTheme } from '@/hooks/useTheme';
import { hitSize } from '@/theme';
import { Button } from './ui/Button';
import { Icon } from './ui/Icon';
import { PhotoView } from './ui/PhotoView';
import { Text } from './ui/Text';
import { TextField } from './ui/TextField';

const MAX_COMMENT = 150;

export interface LikePreview {
  /** e.g. "Maya's photo", "Biscuit", or the prompt text. */
  title: string;
  /** Prompt answer text, when liking a prompt. */
  body?: string;
  photoUrl?: string;
}

interface LikeSheetProps {
  visible: boolean;
  name: string;
  preview: LikePreview | null;
  quota: LikeQuota | undefined;
  sending: boolean;
  onSend: (comment: string, isTreat: boolean) => void;
  onClose: () => void;
}

/**
 * "Like this" with an optional comment, or send the day's Treat instead.
 * Give it a `key` that changes per like so the comment box starts empty each time.
 */
export function LikeSheet({
  visible,
  name,
  preview,
  quota,
  sending,
  onSend,
  onClose,
}: LikeSheetProps) {
  const { colors, radii, spacing } = useTheme();
  const insets = useSafeAreaInsets();
  const [comment, setComment] = useState('');

  const canLike = (quota?.likesRemaining ?? 0) > 0;
  const canTreat = quota?.treatAvailable ?? false;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1, backgroundColor: colors.background }}
      >
        <View
          style={[
            styles.header,
            {
              padding: spacing.lg,
              paddingTop: Platform.OS === 'android' ? insets.top + 12 : spacing.lg,
            },
          ]}
        >
          <Text variant="title" style={{ flex: 1 }}>
            Like {name}
          </Text>
          <Pressable
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Close"
            style={styles.close}
          >
            <Icon name="x" color={colors.text} />
          </Pressable>
        </View>

        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ padding: spacing.lg, paddingTop: 0, gap: spacing.lg }}
        >
          {preview && (
            <View
              style={{
                flexDirection: 'row',
                gap: spacing.md,
                alignItems: 'center',
                backgroundColor: colors.surface,
                borderColor: colors.border,
                borderWidth: 1,
                borderRadius: radii.lg,
                padding: spacing.md,
              }}
            >
              {preview.photoUrl && (
                <View style={{ width: 64, height: 80, borderRadius: radii.md, overflow: 'hidden' }}>
                  <PhotoView
                    url={preview.photoUrl}
                    label={preview.title}
                    style={{ width: 64, height: 80 }}
                  />
                </View>
              )}
              <View style={{ flex: 1, gap: 2 }}>
                <Text variant="smallStrong" color="textMuted">
                  You&apos;re liking
                </Text>
                <Text variant="bodyStrong" numberOfLines={3}>
                  {preview.title}
                </Text>
                {preview.body ? (
                  <Text variant="small" color="textMuted" numberOfLines={3}>
                    {preview.body}
                  </Text>
                ) : null}
              </View>
            </View>
          )}

          <TextField
            label="Add a comment (optional)"
            value={comment}
            onChangeText={setComment}
            multiline
            maxLength={MAX_COMMENT}
            placeholder={`Say something specific. ${name} will see it with your like.`}
            hint={`${comment.length}/${MAX_COMMENT}`}
          />

          <View style={{ gap: spacing.sm }}>
            {canLike && (
              <Button
                label="Send like"
                icon="heart"
                loading={sending}
                onPress={() => onSend(comment, false)}
              />
            )}
            {canTreat && (
              <Button
                label="Send a Treat"
                icon="star"
                variant={canLike ? 'secondary' : 'primary'}
                loading={sending && !canLike}
                disabled={sending && canLike}
                onPress={() => onSend(comment, true)}
                accessibilityHint="Puts you at the top of their Likes You list. One per day."
              />
            )}
            {!canLike && (
              <Text
                variant="small"
                color="textMuted"
                align="center"
                accessibilityLiveRegion="polite"
              >
                You&apos;re out of regular likes today.
                {canTreat ? ' You can still send your Treat.' : ''}
              </Text>
            )}
            {!canTreat && quota && (
              <Text
                variant="caption"
                color="textSubtle"
                align="center"
                style={{ color: colors.textSubtle }}
              >
                Today&apos;s Treat is used. You get another tomorrow.
              </Text>
            )}
            {canTreat && (
              <Text
                variant="caption"
                color="textSubtle"
                align="center"
                style={{ color: colors.textSubtle }}
              >
                A Treat puts you at the top of their Likes You list. One per day.
              </Text>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center' },
  close: { width: hitSize, height: hitSize, alignItems: 'center', justifyContent: 'center' },
});
