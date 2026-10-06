import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Switch, View } from 'react-native';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { ListRow } from '@/components/ui/ListRow';
import { Screen } from '@/components/ui/Screen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Skeleton } from '@/components/ui/Skeleton';
import { Text } from '@/components/ui/Text';
import { useTheme } from '@/hooks/useTheme';
import { useServices } from '@/services';
import { type EmptyStateKey, useDevStore } from '@/state/devStore';
import { useToastStore } from '@/state/toastStore';

const EMPTY_LABELS: Record<EmptyStateKey, string> = {
  discover: 'Discover is empty',
  likes: 'Likes You is empty',
  matches: 'Matches is empty',
};

/** Hidden: long-press the app version in Settings. Mock services only. */
export default function DevMenuScreen() {
  const { colors, spacing } = useTheme();
  const { dev } = useServices();
  const queryClient = useQueryClient();
  const toast = useToastStore((s) => s.show);
  const { forceEmpty, toggleEmpty } = useDevStore();

  const users = useQuery({
    queryKey: ['dev', 'users'],
    queryFn: () => dev!.listUsers(),
    enabled: !!dev,
  });
  const activeId = dev?.getActiveUserId();

  const run = useMutation({
    mutationFn: async (action: () => Promise<string | void>) => action(),
    onSuccess: async (message) => {
      await queryClient.invalidateQueries();
      if (message) toast(message);
    },
  });

  if (!dev) {
    return (
      <Screen noTopInset>
        <ScreenHeader title="Dev Menu" back />
        <Text color="textMuted">Dev tools are only available with mock services.</Text>
      </Screen>
    );
  }

  return (
    <Screen scroll noTopInset>
      <ScreenHeader title="Dev Menu" back />

      <Text variant="smallStrong" color="textMuted" style={{ marginBottom: spacing.sm }}>
        Simulate
      </Text>
      <View style={{ gap: spacing.sm }}>
        <Button
          label="Incoming like"
          variant="secondary"
          onPress={() => run.mutate(() => dev.simulateIncomingLike())}
        />
        <Button
          label="New match"
          variant="secondary"
          onPress={() => run.mutate(() => dev.simulateNewMatch())}
        />
        <Button
          label="Incoming message"
          variant="secondary"
          onPress={() => run.mutate(() => dev.simulateIncomingMessage())}
        />
        <Button
          label="Incoming Play Date plan"
          variant="secondary"
          onPress={() => run.mutate(() => dev.simulateIncomingDatePlan())}
        />
        <Button
          label="They accept my Play Date"
          variant="secondary"
          onPress={() => run.mutate(() => dev.simulateDateReply())}
        />
        <Button
          label="Reset all data"
          variant="danger"
          onPress={() => run.mutate(async () => (await dev.reset(), 'Data reset to seed.'))}
        />
      </View>

      <Text
        variant="smallStrong"
        color="textMuted"
        style={{ marginTop: spacing.xl, marginBottom: spacing.sm }}
      >
        Force empty states
      </Text>
      <View style={{ gap: spacing.sm }}>
        {(Object.keys(EMPTY_LABELS) as EmptyStateKey[]).map((key) => (
          <ListRow
            key={key}
            title={EMPTY_LABELS[key]}
            chevron={false}
            trailing={
              <Switch
                value={forceEmpty[key]}
                onValueChange={() => {
                  toggleEmpty(key);
                  void queryClient.invalidateQueries();
                }}
                trackColor={{ true: colors.primary, false: colors.border }}
                accessibilityLabel={EMPTY_LABELS[key]}
              />
            }
          />
        ))}
      </View>

      <Text
        variant="smallStrong"
        color="textMuted"
        style={{ marginTop: spacing.xl, marginBottom: spacing.sm }}
      >
        Active user
      </Text>
      <View style={{ gap: spacing.sm }}>
        {users.isPending
          ? [0, 1, 2].map((i) => <Skeleton key={i} height={56} radius={20} />)
          : users.data?.map((u) => (
              <ListRow
                key={u.id}
                title={u.firstName}
                subtitle={u.kind === 'pet_owner' ? 'Pet owner' : 'Animal lover'}
                chevron={false}
                trailing={u.id === activeId ? <Chip label="Active" tone="primary" /> : undefined}
                onPress={() =>
                  run.mutate(async () => (await dev.switchUser(u.id), `Now using ${u.firstName}.`))
                }
              />
            ))}
      </View>
    </Screen>
  );
}
