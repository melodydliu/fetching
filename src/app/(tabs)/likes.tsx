import { router } from 'expo-router';
import { useState } from 'react';
import { type LayoutChangeEvent, StyleSheet, useWindowDimensions, View } from 'react-native';
import { LikeCard } from '@/components/likes/LikeCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Screen } from '@/components/ui/Screen';
import { Skeleton } from '@/components/ui/Skeleton';
import { Text } from '@/components/ui/Text';
import { ageFromBirthdate } from '@/domain/geo';
import { useIncomingLikes, useUsers, useViewerProfile } from '@/hooks/queries';
import { useTheme } from '@/hooks/useTheme';
import { describeLikeTargetShort } from '@/utils/describeLike';

export default function LikesYouScreen() {
  const { spacing } = useTheme();
  const likes = useIncomingLikes();
  const senderIds = [...new Set(likes.data?.map((l) => l.fromUserId) ?? [])];
  const senders = useUsers(senderIds);
  const viewer = useViewerProfile();
  const { width: windowWidth } = useWindowDimensions();
  // Start from the window width so cards render at once; onLayout then refines it.
  const [gridWidth, setGridWidth] = useState(windowWidth - spacing.lg * 2);
  const cardWidth = Math.floor((gridWidth - spacing.md) / 2);

  const onGridLayout = (e: LayoutChangeEvent) => setGridWidth(e.nativeEvent.layout.width);

  const loading =
    likes.isPending || (senderIds.length > 0 && (senders.isPending || viewer.isPending));

  return (
    <Screen tabbed scroll>
      <Text variant="titleItalic">Likes You</Text>
      <Text variant="small" color="textMuted" style={{ marginBottom: spacing.lg }}>
        {likes.data?.length
          ? `${likes.data.length} ${likes.data.length === 1 ? 'person has' : 'people have'} their eye on you`
          : 'Everyone who has liked you, in one place'}
      </Text>
      {loading ? (
        <View style={[styles.grid, { gap: spacing.md }]} onLayout={onGridLayout}>
          {[0, 1, 2, 3].map((i) => (
            <Skeleton
              key={i}
              width={cardWidth || '48%'}
              height={Math.round(((cardWidth || 160) * 4) / 3)}
              radius={20}
            />
          ))}
        </View>
      ) : likes.isError ? (
        <ErrorState onRetry={() => void likes.refetch()} />
      ) : !likes.data?.length ? (
        <View style={styles.emptyWrap}>
          <EmptyState
            illustration="empty-likes-you"
            title="No likes yet. They're on their way."
            body="When someone likes a photo, prompt or pet of yours, they'll show up here."
            actionLabel="Keep browsing"
            onAction={() => router.navigate('/')}
          />
        </View>
      ) : (
        <View style={[styles.grid, { gap: spacing.md }]} onLayout={onGridLayout}>
          {likes.data.map((like) => {
            const sender = senders.data?.find((u) => u.id === like.fromUserId);
            if (!sender || !viewer.data) return null;
            return (
              <LikeCard
                key={like.id}
                width={cardWidth}
                photoUrl={sender.photos[0]!.url}
                name={sender.firstName}
                age={ageFromBirthdate(sender.birthdate)}
                target={describeLikeTargetShort(like, viewer.data)}
                comment={like.comment || undefined}
                isTreat={like.isTreat}
                onPress={() =>
                  router.push({
                    pathname: '/user/[id]',
                    params: { id: sender.id, likeId: like.id },
                  })
                }
              />
            );
          })}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  emptyWrap: { minHeight: 480 },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
});
