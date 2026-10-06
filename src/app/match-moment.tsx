import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn, ZoomIn } from 'react-native-reanimated';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { ErrorState } from '@/components/ui/ErrorState';
import { Screen } from '@/components/ui/Screen';
import { Skeleton } from '@/components/ui/Skeleton';
import { Text } from '@/components/ui/Text';
import type { Pet, Profile } from '@/domain/types';
import { useMatch, useProfile, useViewerId, useViewerProfile } from '@/hooks/queries';
import { useTheme } from '@/hooks/useTheme';

function PetRow({ pets }: { pets: Pet[] }) {
  const { spacing } = useTheme();
  if (pets.length === 0) return null;
  return (
    <View style={[styles.petRow, { gap: spacing.xs }]}>
      {pets.slice(0, 3).map((pet) => (
        <Avatar
          key={pet.id}
          url={pet.photos[0]?.url ?? 'placeholder://dog'}
          name={pet.name}
          size={44}
        />
      ))}
    </View>
  );
}

function Person({ profile }: { profile: Profile }) {
  const { spacing } = useTheme();
  return (
    <View style={[styles.person, { gap: spacing.sm }]}>
      <Avatar url={profile.user.photos[0]!.url} name={profile.user.firstName} size={132} />
      <Text variant="heading">{profile.user.firstName}</Text>
      <PetRow pets={profile.pets} />
    </View>
  );
}

/** "It's a match!": both people and their pets, with a way into the chat. */
export default function MatchMomentScreen() {
  const { matchId } = useLocalSearchParams<{ matchId: string }>();
  const { spacing } = useTheme();
  const viewerId = useViewerId();
  const viewer = useViewerProfile();
  const match = useMatch(matchId);
  const otherId = match.data?.userIds.find((id) => id !== viewerId);
  const other = useProfile(otherId);

  const ready = !!viewer.data && !!other.data;
  useEffect(() => {
    if (ready) void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [ready]);

  const failed =
    match.isError || other.isError || viewer.isError || (match.isSuccess && !match.data);

  return (
    <Screen contentStyle={styles.center}>
      {failed ? (
        <ErrorState
          message="Your match is saved, we just couldn't load the details."
          onRetry={() => {
            void match.refetch();
            void other.refetch();
            void viewer.refetch();
          }}
        />
      ) : !ready ? (
        <View style={{ gap: spacing.lg, alignItems: 'center' }}>
          <Skeleton height={40} width={220} radius={20} />
          <Skeleton height={132} width={132} radius={66} />
        </View>
      ) : (
        <>
          <Animated.View entering={ZoomIn.duration(400)} style={{ alignItems: 'center' }}>
            <Text variant="displayItalic" color="primary" align="center">
              It&apos;s a match!
            </Text>
            <Text color="textMuted" align="center" style={{ marginTop: spacing.sm }}>
              You and {other.data.user.firstName} liked each other. Your pets can&apos;t wait.
            </Text>
          </Animated.View>

          <Animated.View
            entering={FadeIn.delay(200).duration(400)}
            style={[styles.people, { gap: spacing.xl, marginVertical: spacing.xxl }]}
          >
            <Person profile={viewer.data} />
            <Person profile={other.data} />
          </Animated.View>

          <View style={[styles.actions, { gap: spacing.sm }]}>
            <Button
              label="Send a message"
              icon="chat"
              onPress={() => router.replace(`/chat/${matchId}`)}
            />
            <Button label="Keep browsing" variant="ghost" onPress={() => router.back()} />
          </View>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center' },
  people: { flexDirection: 'row', justifyContent: 'center' },
  person: { alignItems: 'center' },
  petRow: { flexDirection: 'row' },
  actions: { alignSelf: 'stretch' },
});
