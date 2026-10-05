import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { Avatar } from '@/components/ui/Avatar';
import { Chip } from '@/components/ui/Chip';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { ListRow } from '@/components/ui/ListRow';
import { Screen } from '@/components/ui/Screen';
import { Skeleton } from '@/components/ui/Skeleton';
import { Text } from '@/components/ui/Text';
import { useMatches, useUsers } from '@/hooks/queries';
import { useTheme } from '@/hooks/useTheme';

export default function MatchesScreen() {
  const { spacing } = useTheme();
  const matches = useMatches();
  const otherIds = [...new Set(matches.data?.map((m) => m.otherUserId) ?? [])];
  const others = useUsers(otherIds);
  const loading = matches.isPending || (otherIds.length > 0 && others.isPending);

  return (
    <Screen tabbed scroll>
      <Text variant="titleItalic" style={{ marginBottom: spacing.lg }}>
        Matches
      </Text>
      {loading ? (
        <View style={{ gap: spacing.md }}>
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} height={80} radius={20} />
          ))}
        </View>
      ) : matches.isError ? (
        <ErrorState onRetry={() => void matches.refetch()} />
      ) : !matches.data?.length ? (
        <View style={styles.emptyWrap}>
          <EmptyState
            illustration="speech-paws"
            title="Your first match is out there"
            body="Like a photo, a prompt, or a pet that makes you smile. When it's mutual, you'll chat here."
            actionLabel="Go to Discover"
            onAction={() => router.navigate('/')}
          />
        </View>
      ) : (
        <View style={{ gap: spacing.md }}>
          {matches.data.map((m) => {
            const other = others.data?.find((u) => u.id === m.otherUserId);
            if (!other) return null;
            return (
              <ListRow
                key={m.match.id}
                leading={<Avatar url={other.photos[0]!.url} name={other.firstName} />}
                title={other.firstName}
                subtitle={
                  m.lastMessage?.text ??
                  (m.lastMessage ? 'Sent a pup date plan' : 'You matched! Say hi.')
                }
                trailing={
                  m.yourTurn ? (
                    <Chip label="Your turn" tone="primary" />
                  ) : m.isNew ? (
                    <Chip label="New" tone="accent" />
                  ) : undefined
                }
                chevron={false}
              />
            );
          })}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({ emptyWrap: { minHeight: 480 } });
