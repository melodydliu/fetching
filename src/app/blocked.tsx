import { View } from 'react-native';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Screen } from '@/components/ui/Screen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Skeleton } from '@/components/ui/Skeleton';
import { Text } from '@/components/ui/Text';
import { useBlockedUsers } from '@/hooks/queries';
import { useSafetyActions } from '@/hooks/safetyActions';
import { useTheme } from '@/hooks/useTheme';

/** People you've blocked, with a way to undo it. */
export default function BlockedUsersScreen() {
  const { colors, radii, spacing } = useTheme();
  const blocked = useBlockedUsers();
  const { unblock } = useSafetyActions();

  return (
    <Screen scroll>
      <ScreenHeader title="Blocked people" back />
      {blocked.isPending ? (
        <View style={{ gap: spacing.md }}>
          {[0, 1].map((i) => (
            <Skeleton key={i} height={72} radius={radii.lg} />
          ))}
        </View>
      ) : blocked.isError ? (
        <ErrorState onRetry={() => void blocked.refetch()} />
      ) : blocked.data.length === 0 ? (
        <View style={{ minHeight: 420 }}>
          <EmptyState
            illustration="bowl"
            title="Nobody blocked"
            body="People you block can't see you and you won't see them. They'll show up here if you ever need to undo it."
          />
        </View>
      ) : (
        <View style={{ gap: spacing.md }}>
          {blocked.data.map((u) => (
            <View
              key={u.id}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: spacing.md,
                padding: spacing.md,
                backgroundColor: colors.surface,
                borderColor: colors.border,
                borderWidth: 1,
                borderRadius: radii.lg,
              }}
            >
              <Avatar url={u.photos[0]?.url ?? 'placeholder://dog'} name={u.firstName} size={48} />
              <Text variant="bodyStrong" style={{ flex: 1 }}>
                {u.firstName}
              </Text>
              <Button
                label="Unblock"
                variant="secondary"
                onPress={() => unblock.mutate(u.id)}
                loading={unblock.isPending && unblock.variables === u.id}
                accessibilityHint={`Unblock ${u.firstName}`}
              />
            </View>
          ))}
        </View>
      )}
    </Screen>
  );
}
