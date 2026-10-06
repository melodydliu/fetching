import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ProfileView } from '@/components/ProfileView';
import { SafetySheet } from '@/components/safety/SafetySheet';
import { ErrorState } from '@/components/ui/ErrorState';
import { Icon } from '@/components/ui/Icon';
import { Skeleton } from '@/components/ui/Skeleton';
import { Text } from '@/components/ui/Text';
import { distanceMiles, hasCoordinates } from '@/domain/geo';
import { useIncomingLikes, useProfile, useViewerId, useViewerProfile } from '@/hooks/queries';
import { useTheme } from '@/hooks/useTheme';
import { useServices } from '@/services';
import { useToastStore } from '@/state/toastStore';
import { describeLikeTarget } from '@/utils/describeLike';

/**
 * Someone's full profile. Opened from Likes You (with `likeId`: shows what they liked, plus
 * Like back / Remove) or from a chat header (no actions).
 */
export default function UserProfileScreen() {
  const { id, likeId, matchId } = useLocalSearchParams<{
    id: string;
    likeId?: string;
    matchId?: string;
  }>();
  const { colors, radii, shadows, spacing } = useTheme();
  const insets = useSafeAreaInsets();
  const viewerId = useViewerId();
  const { likes } = useServices();
  const queryClient = useQueryClient();
  const toast = useToastStore((s) => s.show);

  const profile = useProfile(id);
  const viewer = useViewerProfile();
  const incoming = useIncomingLikes();
  const like = likeId ? incoming.data?.find((l) => l.id === likeId) : undefined;

  const name = profile.data?.user.firstName ?? 'them';
  const [safetyOpen, setSafetyOpen] = useState(false);

  const likeBack = useMutation({
    mutationFn: () => likes.likeBack(likeId!, viewerId!),
    onSuccess: (match) => {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      void queryClient.invalidateQueries({ queryKey: ['likes'] });
      void queryClient.invalidateQueries({ queryKey: ['matches'] });
      router.replace({ pathname: '/match-moment', params: { matchId: match.id } });
    },
    onError: () => {
      void queryClient.invalidateQueries({ queryKey: ['likes'] });
      toast("Couldn't match just now. Try again.");
    },
  });

  const remove = useMutation({
    mutationFn: () => likes.remove(likeId!),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['likes'] });
      toast(`Removed ${name}`);
      router.back();
    },
    onError: () => toast("Couldn't remove that. Try again."),
  });

  const back = (
    <Pressable
      onPress={() => router.back()}
      accessibilityRole="button"
      accessibilityLabel="Go back"
      style={[
        styles.back,
        {
          top: insets.top + spacing.sm,
          left: spacing.md,
          backgroundColor: colors.surface,
          borderRadius: radii.pill,
        },
        shadows.floating,
        { shadowColor: colors.shadow },
      ]}
    >
      <Icon name="chevron-left" color={colors.text} />
    </Pressable>
  );

  const loading = profile.isPending || (!!likeId && (incoming.isPending || viewer.isPending));
  const busy = likeBack.isPending || remove.isPending;

  return (
    <View style={[styles.flex, { backgroundColor: colors.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: like ? insets.bottom + 140 : insets.bottom + 40 }}
      >
        {loading ? (
          <View style={{ padding: spacing.lg, paddingTop: insets.top + 64, gap: spacing.md }}>
            <Skeleton height={460} radius={radii.xl} />
            <Skeleton height={120} radius={radii.xl} />
          </View>
        ) : profile.isError ? (
          <View style={{ padding: spacing.lg, paddingTop: insets.top + 64 }}>
            <ErrorState onRetry={() => void profile.refetch()} />
          </View>
        ) : (
          <ProfileView
            profile={profile.data}
            distanceMiles={
              // Real backend: other people's coordinates are private (0/0), so show no distance.
              viewer.data &&
              hasCoordinates(viewer.data.user.location) &&
              hasCoordinates(profile.data.user.location)
                ? distanceMiles(viewer.data.user.location, profile.data.user.location)
                : undefined
            }
            likedYou={like ? { isTreat: like.isTreat } : null}
            onMorePress={() => setSafetyOpen(true)}
            heroOverlay={
              like && viewer.data ? (
                <View
                  style={[
                    styles.likeCard,
                    {
                      backgroundColor: colors.surface,
                      borderRadius: radii.lg,
                      padding: spacing.md,
                      gap: spacing.xs,
                      marginTop: 56,
                    },
                  ]}
                  accessible
                  accessibilityLabel={`${describeLikeTarget(like, viewer.data)}${
                    like.comment ? `. They said: ${like.comment}` : ''
                  }`}
                >
                  <Text variant="smallStrong">
                    {like.isTreat ? 'Treat · ' : ''}
                    {describeLikeTarget(like, viewer.data)}
                  </Text>
                  {like.comment ? <Text color="textMuted">“{like.comment}”</Text> : null}
                </View>
              ) : null
            }
          />
        )}
      </ScrollView>

      {back}

      {profile.data ? (
        <SafetySheet
          visible={safetyOpen}
          userId={profile.data.user.id}
          name={name}
          matchId={matchId}
          onClose={() => setSafetyOpen(false)}
          onDone={(outcome) => {
            if (outcome === 'reported') return;
            // Leaving a matched person's profile also leaves their (now gone) chat.
            if (matchId) router.navigate('/matches');
            else router.back();
          }}
        />
      ) : null}

      {like && profile.data ? (
        <View style={[styles.floatBar, { bottom: Math.max(insets.bottom, 12) + 12 }]}>
          <FloatButton
            icon="x"
            label={`Remove ${name}`}
            onPress={() => remove.mutate()}
            disabled={busy}
          />
          <FloatButton
            icon="heart"
            primary
            label={`Like ${name} back`}
            onPress={() => likeBack.mutate()}
            disabled={busy}
          />
        </View>
      ) : null}
    </View>
  );
}

function FloatButton({
  icon,
  label,
  primary,
  disabled,
  onPress,
}: {
  icon: 'x' | 'heart';
  label: string;
  primary?: boolean;
  disabled?: boolean;
  onPress: () => void;
}) {
  const { colors, radii, shadows } = useTheme();
  return (
    <Pressable
      disabled={disabled}
      onPress={() => {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      style={({ pressed }) => [
        styles.floatButton,
        shadows.floating,
        {
          borderRadius: radii.pill,
          backgroundColor: primary ? colors.primary : colors.surface,
          shadowColor: colors.shadow,
          opacity: disabled ? 0.6 : 1,
          transform: [{ scale: pressed ? 0.94 : 1 }],
        },
      ]}
    >
      <Icon
        name={icon}
        size={36}
        color={primary ? colors.onPrimary : colors.textMuted}
        filled={primary}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  back: {
    position: 'absolute',
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  likeCard: { alignSelf: 'stretch' },
  floatBar: { position: 'absolute', alignSelf: 'center', flexDirection: 'row', gap: 24 },
  floatButton: { width: 84, height: 84, alignItems: 'center', justifyContent: 'center' },
});
