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
import { ageFromBirthdate } from '@/domain/geo';
import { useIncomingLikes, useUsers, useViewerProfile } from '@/hooks/queries';
import { useTheme } from '@/hooks/useTheme';
import { describeLikeTarget } from '@/utils/describeLike';

export default function LikesYouScreen() {
  const { spacing } = useTheme();
  const likes = useIncomingLikes();
  const senderIds = [...new Set(likes.data?.map((l) => l.fromUserId) ?? [])];
  const senders = useUsers(senderIds);
  const viewer = useViewerProfile();

  const loading =
    likes.isPending || (senderIds.length > 0 && (senders.isPending || viewer.isPending));

  return (
    <Screen tabbed scroll>
      <Text variant="titleItalic" style={{ marginBottom: spacing.lg }}>
        Likes You
      </Text>
      {loading ? (
        <View style={{ gap: spacing.md }}>
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} height={88} radius={20} />
          ))}
        </View>
      ) : likes.isError ? (
        <ErrorState onRetry={() => void likes.refetch()} />
      ) : !likes.data?.length ? (
        <View style={styles.emptyWrap}>
          <EmptyState
            illustration="heart-leash"
            title="No likes yet. They're on their way."
            body="When someone likes a photo, prompt or pet of yours, they'll show up here."
            actionLabel="Keep browsing"
            onAction={() => router.navigate('/')}
          />
        </View>
      ) : (
        <View style={{ gap: spacing.md }}>
          {likes.data.map((like) => {
            const sender = senders.data?.find((u) => u.id === like.fromUserId);
            if (!sender || !viewer.data) return null;
            return (
              <ListRow
                key={like.id}
                leading={<Avatar url={sender.photos[0]!.url} name={sender.firstName} />}
                title={`${sender.firstName}, ${ageFromBirthdate(sender.birthdate)}`}
                subtitle={[
                  describeLikeTarget(like, viewer.data),
                  like.comment ? `“${like.comment}”` : null,
                ]
                  .filter(Boolean)
                  .join('\n')}
                trailing={like.isTreat ? <Chip label="Treat" tone="accent" /> : undefined}
                onPress={() =>
                  router.push({
                    pathname: '/user/[id]',
                    params: { id: sender.id, likeId: like.id },
                  })
                }
                accessibilityHint="Opens their profile"
              />
            );
          })}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({ emptyWrap: { minHeight: 480 } });
