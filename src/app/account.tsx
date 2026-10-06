import { View } from 'react-native';
import { ErrorState } from '@/components/ui/ErrorState';
import { ListRow } from '@/components/ui/ListRow';
import { Screen } from '@/components/ui/Screen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Skeleton } from '@/components/ui/Skeleton';
import { Text } from '@/components/ui/Text';
import { formatMemberSince, maskIdentifier } from '@/domain/account';
import { useAccountInfo, useViewerProfile } from '@/hooks/queries';
import { useTheme } from '@/hooks/useTheme';

/** Read-only account details (mocked). Changing the login comes with real auth. */
export default function AccountScreen() {
  const { spacing } = useTheme();
  const account = useAccountInfo();
  const profile = useViewerProfile();

  return (
    <Screen scroll>
      <ScreenHeader title="Account" back />
      {account.isPending || profile.isPending ? (
        <View style={{ gap: spacing.md }}>
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} height={72} radius={20} />
          ))}
        </View>
      ) : account.isError || profile.isError || !account.data || !profile.data ? (
        <ErrorState
          onRetry={() => {
            void account.refetch();
            void profile.refetch();
          }}
        />
      ) : (
        <View style={{ gap: spacing.sm }}>
          <ListRow
            title={account.data.method === 'phone' ? 'Phone number' : 'Email'}
            subtitle={maskIdentifier(account.data)}
            chevron={false}
          />
          <ListRow
            title="Member since"
            subtitle={formatMemberSince(account.data.createdAt)}
            chevron={false}
          />
          <Text variant="small" color="textMuted" style={{ marginTop: spacing.md }}>
            You&apos;re using a demo login. Changing your phone or email arrives with real accounts.
          </Text>
        </View>
      )}
    </Screen>
  );
}
