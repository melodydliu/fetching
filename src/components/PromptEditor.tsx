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
import { config } from '@/config';
import { PROMPTS, promptById } from '@/config/prompts';
import type { AccountKind, PromptAnswer } from '@/domain/types';
import { useTheme } from '@/hooks/useTheme';
import { hitSize } from '@/theme';
import { newId } from '@/utils/id';
import { Button } from './ui/Button';
import { ChoiceChips } from './ui/ChoiceChips';
import { Icon } from './ui/Icon';
import { Text } from './ui/Text';
import { TextField } from './ui/TextField';

const MAX_LENGTH = 180;

interface PromptEditorProps {
  answers: PromptAnswer[];
  onChange: (answers: PromptAnswer[]) => void;
  /** Animal lovers don't see pet prompts. */
  kind: AccountKind;
}

type Editing = { index: number; promptId: string | null; text: string };

/**
 * Up to `maxPromptAnswers` prompts, at least `minPromptAnswers`. Tap one to edit it, or the
 * dashed slot to add another: pick a prompt, then write the answer.
 */
export function PromptEditor({ answers, onChange, kind }: PromptEditorProps) {
  const { colors, radii, spacing } = useTheme();
  const [editing, setEditing] = useState<Editing | null>(null);

  const open = (index: number) => {
    const existing = answers[index];
    setEditing({ index, promptId: existing?.promptId ?? null, text: existing?.answer ?? '' });
  };

  const save = (editingNow: Editing) => {
    const text = editingNow.text.trim();
    if (!editingNow.promptId || !text) return;
    const next = [...answers];
    const prior = next[editingNow.index];
    next[editingNow.index] = {
      id: prior?.id ?? newId('pa'),
      promptId: editingNow.promptId,
      answer: text,
    };
    onChange(next);
    setEditing(null);
  };

  const remove = (index: number) => {
    onChange(answers.filter((_, i) => i !== index));
    setEditing(null);
  };

  return (
    <View style={{ gap: spacing.md }}>
      {Array.from({ length: Math.min(answers.length + 1, config.maxPromptAnswers) }, (_, i) => {
        const answer = answers[i];
        const prompt = answer && promptById(answer.promptId);
        return (
          <Pressable
            key={i}
            onPress={() => open(i)}
            accessibilityRole="button"
            accessibilityLabel={
              answer
                ? `Prompt ${i + 1}: ${prompt?.text}. ${answer.answer}. Tap to edit.`
                : `Prompt ${i + 1}: select a prompt`
            }
            style={[
              styles.slot,
              {
                backgroundColor: answer ? colors.surface : 'transparent',
                borderColor: answer ? colors.border : colors.primary,
                borderStyle: answer ? 'solid' : 'dashed',
                borderRadius: radii.lg,
                padding: spacing.lg,
                gap: spacing.xs,
              },
            ]}
          >
            {answer ? (
              <>
                <Text variant="smallStrong" color="textMuted">
                  {prompt?.text}
                </Text>
                <Text variant="heading">{answer.answer}</Text>
              </>
            ) : (
              <View style={styles.addRow}>
                <Icon name="plus" size={20} color={colors.primary} />
                <Text variant="bodyStrong" color="primary">
                  {answers.length === 0 ? 'Select a prompt' : 'Add another prompt'}
                </Text>
              </View>
            )}
          </Pressable>
        );
      })}

      <PromptModal
        editing={editing}
        kind={kind}
        usedIds={answers.map((a, i) => (i === editing?.index ? '' : a.promptId))}
        canRemove={
          !!editing && !!answers[editing.index] && answers.length > config.minPromptAnswers
        }
        onChange={setEditing}
        onSave={save}
        onRemove={() => editing && remove(editing.index)}
        onClose={() => setEditing(null)}
      />
    </View>
  );
}

interface ModalProps {
  editing: Editing | null;
  kind: AccountKind;
  usedIds: string[];
  canRemove: boolean;
  onChange: (e: Editing) => void;
  onSave: (e: Editing) => void;
  onRemove: () => void;
  onClose: () => void;
}

function PromptModal({
  editing,
  kind,
  usedIds,
  canRemove,
  onChange,
  onSave,
  onRemove,
  onClose,
}: ModalProps) {
  const { colors, radii, spacing } = useTheme();
  const insets = useSafeAreaInsets();
  const [category, setCategory] = useState<'all' | 'personal' | 'pet'>('all');

  const prompt = editing?.promptId ? promptById(editing.promptId) : undefined;
  const choices = PROMPTS.filter(
    (p) =>
      !usedIds.includes(p.id) &&
      (kind === 'pet_owner' || p.category === 'personal') &&
      (category === 'all' || p.category === category),
  );

  return (
    <Modal
      visible={!!editing}
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
            {prompt ? 'Your answer' : 'Pick a prompt'}
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

        {editing && !prompt ? (
          <ScrollView
            contentContainerStyle={{ padding: spacing.lg, paddingTop: 0, gap: spacing.md }}
          >
            {kind === 'pet_owner' && (
              <ChoiceChips
                label="Prompt category"
                options={[
                  { value: 'all', label: 'All' },
                  { value: 'personal', label: 'About me' },
                  { value: 'pet', label: 'My pet' },
                ]}
                value={[category]}
                onChange={([c]) => setCategory(c as typeof category)}
              />
            )}
            {choices.map((p) => (
              <Pressable
                key={p.id}
                onPress={() => onChange({ ...editing, promptId: p.id })}
                accessibilityRole="button"
                accessibilityLabel={p.text}
                style={{
                  minHeight: hitSize + 8,
                  justifyContent: 'center',
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  borderWidth: 1,
                  borderRadius: radii.lg,
                  padding: spacing.lg,
                }}
              >
                <Text variant="bodyStrong">{p.text}</Text>
              </Pressable>
            ))}
          </ScrollView>
        ) : editing && prompt ? (
          <View style={{ flex: 1, padding: spacing.lg, paddingTop: 0, gap: spacing.lg }}>
            <Pressable
              onPress={() => onChange({ ...editing, promptId: null })}
              accessibilityRole="button"
              accessibilityLabel="Change prompt"
              accessibilityHint={prompt.text}
            >
              <Text variant="heading">{prompt.text}</Text>
              <Text variant="small" color="primary">
                Change prompt
              </Text>
            </Pressable>
            <TextField
              label="Your answer"
              hideLabel
              value={editing.text}
              onChangeText={(text) => onChange({ ...editing, text })}
              multiline
              autoFocus
              maxLength={MAX_LENGTH}
              placeholder="Write something that sounds like you"
              hint={`${editing.text.length}/${MAX_LENGTH}`}
            />
            <View style={{ flex: 1 }} />
            <View style={{ gap: spacing.sm, paddingBottom: insets.bottom + spacing.sm }}>
              <Button
                label="Save answer"
                onPress={() => onSave(editing)}
                disabled={!editing.text.trim()}
              />
              {canRemove && (
                <Button label="Remove this prompt" variant="ghost" onPress={onRemove} />
              )}
            </View>
          </View>
        ) : null}
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  slot: { minHeight: 88, borderWidth: 1.5, justifyContent: 'center' },
  addRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  header: { flexDirection: 'row', alignItems: 'center' },
  close: { width: hitSize, height: hitSize, alignItems: 'center', justifyContent: 'center' },
});
