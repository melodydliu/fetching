import { useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { config } from '@/config';
import type { Photo } from '@/domain/types';
import { useTheme } from '@/hooks/useTheme';
import { hitSize } from '@/theme';
import { Button } from './ui/Button';
import { Icon } from './ui/Icon';
import { PhotoView } from './ui/PhotoView';
import { Text } from './ui/Text';
import { TextField } from './ui/TextField';

interface CaptionModalProps {
  /** The photo being captioned; null keeps the sheet closed. */
  photo: Photo | null;
  onSave: (caption: string | undefined) => void;
  onClose: () => void;
}

/** A small sheet to write (or clear) one photo's caption. */
export function CaptionModal({ photo, onSave, onClose }: CaptionModalProps) {
  return (
    <Modal
      visible={!!photo}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      {/* Keyed on the photo so the text resets for each one. */}
      {photo ? (
        <CaptionForm key={photo.id} photo={photo} onSave={onSave} onClose={onClose} />
      ) : null}
    </Modal>
  );
}

function CaptionForm({
  photo,
  onSave,
  onClose,
}: {
  photo: Photo;
  onSave: (caption: string | undefined) => void;
  onClose: () => void;
}) {
  const { colors, radii, spacing } = useTheme();
  const insets = useSafeAreaInsets();
  const [text, setText] = useState(photo.caption ?? '');
  const max = config.maxCaptionLength;
  const trimmed = text.trim();

  return (
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
          Photo caption
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

      <View style={{ flex: 1, padding: spacing.lg, paddingTop: 0, gap: spacing.lg }}>
        <PhotoView
          url={photo.url}
          label="Photo being captioned"
          style={{ width: 120, height: 160, borderRadius: radii.md }}
        />
        <TextField
          label="Caption"
          hideLabel
          value={text}
          onChangeText={setText}
          autoFocus
          multiline
          maxLength={max}
          placeholder="Say something about this photo"
          hint={`${text.length}/${max}`}
        />
        <View style={{ flex: 1 }} />
        <View style={{ gap: spacing.sm, paddingBottom: insets.bottom + spacing.sm }}>
          <Button label="Save caption" onPress={() => onSave(trimmed || undefined)} />
          {photo.caption ? (
            <Button label="Remove caption" variant="ghost" onPress={() => onSave(undefined)} />
          ) : null}
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center' },
  close: { width: hitSize, height: hitSize, alignItems: 'center', justifyContent: 'center' },
});
