import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { DateTimePicker } from '@/components/chat/DateTimePicker';
import { Button } from '@/components/ui/Button';
import { ChoiceChips } from '@/components/ui/ChoiceChips';
import { Screen } from '@/components/ui/Screen';
import { ErrorState } from '@/components/ui/ErrorState';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Skeleton } from '@/components/ui/Skeleton';
import { Text } from '@/components/ui/Text';
import { TextField } from '@/components/ui/TextField';
import { PLAY_DATE_LABELS } from '@/config/reference';
import {
  MAX_CUSTOM_LABEL,
  MAX_DATE_NOTE,
  MAX_LOCATION,
  PLAY_DATE_KINDS,
  validatePlanDraft,
} from '@/domain/datePlans';
import type { DatePlan, PlayDateKind } from '@/domain/types';
import { queryKeys, useDatePlan, useViewerId } from '@/hooks/queries';
import { useTheme } from '@/hooks/useTheme';
import { useServices } from '@/services';
import { useToastStore } from '@/state/toastStore';

const KIND_OPTIONS = PLAY_DATE_KINDS.map((value) => ({ value, label: PLAY_DATE_LABELS[value] }));

/**
 * "Plan a Play Date": what, where, when, then it lands in the chat as a card to answer.
 * With `?planId=` it edits that plan instead (and asks the other person again).
 */
export default function PlayDateScreen() {
  const { matchId, planId } = useLocalSearchParams<{ matchId: string; planId?: string }>();
  const { spacing } = useTheme();
  const plan = useDatePlan(planId);

  if (!planId) return <PlayDateForm matchId={matchId} />;
  if (plan.isPending || plan.isError || !plan.data) {
    return (
      <Screen noTopInset contentStyle={{ gap: spacing.xl, paddingTop: spacing.xl }}>
        <ScreenHeader title="Edit Play Date" back />
        {plan.isPending ? (
          <Skeleton height={200} radius={28} />
        ) : (
          <ErrorState
            message={plan.isError ? undefined : 'This Play Date was deleted.'}
            onRetry={() => (plan.isError ? void plan.refetch() : router.back())}
          />
        )}
      </Screen>
    );
  }
  return <PlayDateForm matchId={matchId} plan={plan.data} />;
}

function PlayDateForm({ matchId, plan }: { matchId: string; plan?: DatePlan }) {
  const { spacing } = useTheme();
  const viewerId = useViewerId();
  const { chat } = useServices();
  const queryClient = useQueryClient();
  const toast = useToastStore((s) => s.show);

  const [kind, setKind] = useState<PlayDateKind | null>(plan?.kind ?? null);
  const [customLabel, setCustomLabel] = useState(plan?.customLabel ?? '');
  const [location, setLocation] = useState(plan?.location ?? '');
  const [startsAt, setStartsAt] = useState<Date | null>(plan ? new Date(plan.startsAt) : null);
  const [note, setNote] = useState(plan?.note ?? '');
  const [showError, setShowError] = useState(false);

  const problem = validatePlanDraft({ kind, customLabel, startsAt });

  const propose = useMutation({
    mutationFn: async () => {
      const input = {
        kind: kind!,
        customLabel: kind === 'custom' ? customLabel.trim() : undefined,
        location: location.trim() || undefined,
        startsAt: startsAt!.toISOString(),
        note: note.trim() || undefined,
      };
      if (plan) return chat.updateDatePlan(plan.id, viewerId!, input);
      return (await chat.proposeDate({ matchId, proposerId: viewerId!, ...input })).plan;
    },
    onSuccess: (saved) => {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      queryClient.setQueryData(queryKeys.datePlan(saved.id), saved);
      void queryClient.invalidateQueries({ queryKey: queryKeys.messages(matchId) });
      void queryClient.invalidateQueries({ queryKey: ['matches'] });
      toast(plan ? 'Play Date updated' : 'Play Date sent');
      router.back();
    },
    onError: () => toast("Couldn't send that. Try again."),
  });

  const submit = () => {
    if (problem) {
      setShowError(true);
      return;
    }
    propose.mutate();
  };

  return (
    <Screen scroll noTopInset contentStyle={{ gap: spacing.xl, paddingTop: spacing.xl }}>
      <ScreenHeader title={plan ? 'Edit Play Date' : 'Plan a Play Date'} back />

      <View style={{ gap: spacing.sm }}>
        <Text variant="heading">What kind of date?</Text>
        <ChoiceChips
          label="Kind of date"
          options={KIND_OPTIONS}
          value={kind ? [kind] : []}
          onChange={([next]) => {
            setKind(next ?? null);
          }}
        />
      </View>

      {kind === 'custom' ? (
        <TextField
          label="What do you have in mind?"
          value={customLabel}
          onChangeText={setCustomLabel}
          maxLength={MAX_CUSTOM_LABEL}
          placeholder="Puppy yoga, a pumpkin patch..."
        />
      ) : null}

      <TextField
        label="Where? (optional)"
        value={location}
        onChangeText={setLocation}
        maxLength={MAX_LOCATION}
        placeholder="Name or address, e.g. 120 Meadow Ln"
        autoCapitalize="words"
        textContentType="fullStreetAddress"
      />

      <View style={{ gap: spacing.sm }}>
        <Text variant="heading">When?</Text>
        <DateTimePicker value={startsAt} onChange={setStartsAt} />
      </View>

      <TextField
        label="Add a note (optional)"
        value={note}
        onChangeText={setNote}
        maxLength={MAX_DATE_NOTE}
        placeholder="Bring a ball!"
      />

      {showError && problem ? (
        <Text color="danger" accessibilityLiveRegion="polite">
          {problem}
        </Text>
      ) : null}

      {plan ? (
        <Text variant="small" color="textMuted">
          Saving sends it to them again to confirm.
        </Text>
      ) : null}

      <Button
        label={plan ? 'Save changes' : 'Send Play Date'}
        icon={plan ? 'check' : 'paw'}
        onPress={submit}
        loading={propose.isPending}
      />
    </Screen>
  );
}
