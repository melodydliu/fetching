import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, View, type ViewStyle } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LikeSheet, type LikePreview } from '@/components/LikeSheet';
import { ProfileView } from '@/components/ProfileView';
import { SafetySheet } from '@/components/safety/SafetySheet';
import { Chip } from '@/components/ui/Chip';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Icon } from '@/components/ui/Icon';
import { TAB_BAR_CLEARANCE } from '@/components/ui/Screen';
import { Skeleton } from '@/components/ui/Skeleton';
import { Text } from '@/components/ui/Text';
import { promptById } from '@/config/prompts';
import {
  buildProfileSections,
  heroBlockOf,
  likeTargetOf,
  type ProfileBlock,
} from '@/domain/profileBlocks';
import type { ID, LikeTarget } from '@/domain/types';
import { useCandidates, useIncomingLikes, useLikeQuota, useViewerId } from '@/hooks/queries';
import { useTheme } from '@/hooks/useTheme';
import { AlreadyLikedError, QuotaExceededError, useServices } from '@/services';
import { useToastStore } from '@/state/toastStore';

/**
 * On web the tab slot grows to fit its content, so without a cap the page scrolls and the
 * floating Skip/Like pair ends up at the very bottom of it. Native screens are already bounded.
 */
const webViewportCap = (
  Platform.OS === 'web'
    ? { flexGrow: 0, flexBasis: 'auto', height: '100vh', overflow: 'hidden' }
    : null
) as ViewStyle | null;

interface LikeDraft {
  block: ProfileBlock;
  target: LikeTarget;
  toUserId: ID;
  name: string;
}

/** "Resets in 6h 12m", from the quota's reset time. */
function resetsIn(iso: string | undefined): string {
  if (!iso) return 'tomorrow';
  const minutes = Math.max(1, Math.round((new Date(iso).getTime() - Date.now()) / 60_000));
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `in ${h}h ${m}m` : `in ${m}m`;
}

export default function DiscoverScreen() {
  const { colors, radii, spacing } = useTheme();
  const insets = useSafeAreaInsets();
  const viewerId = useViewerId();
  const { likes, discovery } = useServices();
  const queryClient = useQueryClient();
  const toast = useToastStore((s) => s.show);
  const scrollRef = useRef<ScrollView>(null);

  const candidates = useCandidates();
  const quota = useLikeQuota();
  // Only point people at Likes You when someone is actually waiting there.
  const incomingLikes = useIncomingLikes();
  const hasLikesWaiting = (incomingLikes.data?.length ?? 0) > 0;
  const [handled, setHandled] = useState<ReadonlySet<ID>>(new Set());
  const [liking, setLiking] = useState<LikeDraft | null>(null);
  const [safetyOpen, setSafetyOpen] = useState(false);
  /** The last profile you skipped, so you can take it back. */
  const [skipped, setSkipped] = useState<{ id: ID; name: string } | null>(null);

  const list = candidates.data;
  const current = list?.find((c) => !handled.has(c.user.id));
  const heroBlock = current ? heroBlockOf(buildProfileSections(current)) : null;
  const markHandled = (id: ID) => setHandled((prev) => new Set(prev).add(id));

  // Ran through everyone we fetched: pull the next batch, then forget the local "handled" set.
  const { isFetching, refetch } = candidates;
  useEffect(() => {
    if (list && list.length > 0 && !current && !isFetching) {
      void refetch().then(() => setHandled(new Set()));
    }
  }, [list, current, isFetching, refetch]);

  // Every new profile starts at the top.
  const currentId = current?.user.id;
  useEffect(() => {
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  }, [currentId]);

  const skip = () => {
    if (!current || !viewerId) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    markHandled(current.user.id);
    setSkipped({ id: current.user.id, name: current.user.firstName });
    void discovery.pass(viewerId, current.user.id);
  };

  const undoSkip = () => {
    if (!skipped || !viewerId) return;
    void Haptics.selectionAsync();
    const { id } = skipped;
    setSkipped(null);
    setHandled((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    void discovery.unpass(viewerId, id).then(() => refetch());
  };

  const sendLike = useMutation({
    mutationFn: ({
      draft,
      comment,
      isTreat,
    }: {
      draft: LikeDraft;
      comment: string;
      isTreat: boolean;
    }) =>
      likes.send({
        fromUserId: viewerId!,
        toUserId: draft.toUserId,
        target: draft.target,
        comment,
        isTreat,
      }),
    onSuccess: (result, { draft, isTreat }) => {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      markHandled(draft.toUserId);
      setSkipped(null);
      setLiking(null);
      void queryClient.invalidateQueries({ queryKey: ['likes'] });
      if (result.match) {
        void queryClient.invalidateQueries({ queryKey: ['matches'] });
        router.push({ pathname: '/match-moment', params: { matchId: result.match.id } });
      } else {
        toast(isTreat ? `Treat sent to ${draft.name}` : `Like sent to ${draft.name}`);
      }
    },
    onError: (error, { draft }) => {
      setLiking(null);
      void queryClient.invalidateQueries({ queryKey: ['likes'] });
      if (error instanceof AlreadyLikedError) {
        markHandled(draft.toUserId);
        toast(`You already liked ${draft.name}`);
      } else if (error instanceof QuotaExceededError) {
        toast(error.message);
      } else {
        toast("Couldn't send that. Try again.");
      }
    },
  });

  const openLike = (block: ProfileBlock) => {
    const target = likeTargetOf(block);
    if (!current || !target) return;
    setLiking({ block, target, toUserId: current.user.id, name: current.user.firstName });
  };

  const preview: LikePreview | null = !liking
    ? null
    : liking.block.type === 'photo'
      ? { title: `${liking.name}'s photo`, photoUrl: liking.block.photo.url }
      : liking.block.type === 'pet'
        ? { title: liking.block.pet.name, photoUrl: liking.block.pet.photos[0]?.url }
        : liking.block.type === 'prompt'
          ? {
              title: promptById(liking.block.answer.promptId)?.text ?? 'Prompt',
              body: liking.block.answer.answer,
            }
          : null;

  const q = quota.data;
  const outOfEverything = !!q && q.likesRemaining === 0 && !q.treatAvailable;
  const barBottom = Math.max(insets.bottom, 12);
  const padded = { paddingTop: insets.top + spacing.md, paddingHorizontal: spacing.lg };

  return (
    <View style={[styles.flex, webViewportCap, { backgroundColor: colors.background }]}>
      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: TAB_BAR_CLEARANCE + insets.bottom + 120,
        }}
      >
        {candidates.isPending || (q === undefined && quota.isPending) ? (
          <View style={[padded, { gap: spacing.md }]}>
            <Skeleton height={460} radius={radii.xl} />
            <Skeleton height={120} radius={radii.xl} />
          </View>
        ) : candidates.isError ? (
          <View style={padded}>
            <ErrorState onRetry={() => void candidates.refetch()} />
          </View>
        ) : outOfEverything ? (
          <View style={[styles.emptyWrap, padded]}>
            <EmptyState
              illustration="tennis-ball"
              title="You're out of likes for today"
              body={`Fresh likes and your next Treat arrive ${resetsIn(q?.resetsAt)}.${
                hasLikesWaiting ? " In the meantime, see who's already into you." : ''
              }`}
              actionLabel={hasLikesWaiting ? 'See Who Likes You' : undefined}
              onAction={hasLikesWaiting ? () => router.navigate('/likes') : undefined}
            />
          </View>
        ) : !current ? (
          list && list.length > 0 ? (
            <View style={padded}>
              <Skeleton height={460} radius={radii.xl} />
            </View>
          ) : (
            <View style={[styles.emptyWrap, padded]}>
              <EmptyState
                illustration="tennis-ball"
                title="You've seen everyone nearby"
                body={`New people and pets join every day. Check back soon${
                  hasLikesWaiting ? ", or see who's liked you." : '!'
                }`}
                actionLabel="Refresh"
                onAction={() => void candidates.refetch()}
                secondaryLabel={hasLikesWaiting ? 'See Who Likes You' : undefined}
                onSecondary={hasLikesWaiting ? () => router.navigate('/likes') : undefined}
              />
            </View>
          )
        ) : (
          <Animated.View key={current.user.id} entering={FadeIn.duration(250)}>
            <ProfileView
              profile={current}
              distanceMiles={current.distanceMiles}
              likedYou={current.likedYou}
              onLikePress={openLike}
              onMorePress={() => setSafetyOpen(true)}
              heroOverlay={
                q ? (
                  <>
                    <View style={[styles.chips, { gap: spacing.sm }]}>
                      <Chip
                        label={
                          q.likesRemaining === 1
                            ? '1 like left today'
                            : `${q.likesRemaining} likes left today`
                        }
                        tone={q.likesRemaining > 0 ? 'accent' : 'neutral'}
                      />
                      <Chip
                        label={q.treatAvailable ? 'Treat ready' : 'Treat used'}
                        tone={q.treatAvailable ? 'sage' : 'neutral'}
                      />
                    </View>
                    {q.likesRemaining === 0 && q.treatAvailable && (
                      <Text
                        variant="small"
                        style={[
                          styles.note,
                          { backgroundColor: colors.surface, borderRadius: radii.md },
                        ]}
                        accessibilityLiveRegion="polite"
                      >
                        You&apos;re out of likes for today, but you can still send a Treat.
                      </Text>
                    )}
                  </>
                ) : null
              }
            />
          </Animated.View>
        )}
      </ScrollView>

      {skipped && (
        <Animated.View
          entering={FadeIn.duration(150)}
          exiting={FadeOut.duration(150)}
          style={[styles.undo, { bottom: barBottom + 76 + 84 + 12 }]}
        >
          <Pressable
            onPress={undoSkip}
            accessibilityRole="button"
            accessibilityLabel={`Undo skip of ${skipped.name}`}
            style={[
              styles.undoButton,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                borderRadius: radii.pill,
              },
            ]}
          >
            <Icon name="chevron-left" size={18} color={colors.primary} />
            <Text variant="smallStrong" color="primary">
              Undo
            </Text>
          </Pressable>
        </Animated.View>
      )}

      {current && heroBlock && !outOfEverything && (
        <Animated.View
          entering={FadeIn.duration(150)}
          exiting={FadeOut.duration(150)}
          style={[styles.floatBar, { bottom: barBottom + 76 }]}
        >
          <FloatButton icon="x" label={`Pass on ${current.user.firstName}`} onPress={skip} />
          <FloatButton
            icon="heart"
            primary
            label={`Like ${current.user.firstName}`}
            onPress={() => openLike(heroBlock)}
          />
        </Animated.View>
      )}

      {current ? (
        <SafetySheet
          visible={safetyOpen}
          userId={current.user.id}
          name={current.user.firstName}
          onClose={() => setSafetyOpen(false)}
          // Blocked or reported people drop out of the feed right away.
          onDone={() => {
            markHandled(current.user.id);
            if (viewerId) void discovery.pass(viewerId, current.user.id);
          }}
        />
      ) : null}

      <LikeSheet
        key={liking ? `${liking.toUserId}:${liking.target.id}` : 'closed'}
        visible={!!liking}
        name={liking?.name ?? ''}
        preview={preview}
        quota={q}
        sending={sendLike.isPending}
        onClose={() => setLiking(null)}
        onSend={(comment, isTreat) =>
          liking && sendLike.mutate({ draft: liking, comment, isTreat })
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center' },
  emptyWrap: { minHeight: 480 },
  note: { paddingHorizontal: 12, paddingVertical: 8, overflow: 'hidden' },
  floatBar: {
    position: 'absolute',
    alignSelf: 'center',
    flexDirection: 'row',
    gap: 24,
  },
  undo: { position: 'absolute', alignSelf: 'center' },
  undoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minHeight: 48,
    paddingHorizontal: 16,
    borderWidth: StyleSheet.hairlineWidth,
  },
  floatButton: { width: 84, height: 84, alignItems: 'center', justifyContent: 'center' },
});

function FloatButton({
  icon,
  label,
  primary,
  onPress,
}: {
  icon: 'x' | 'heart';
  label: string;
  primary?: boolean;
  onPress: () => void;
}) {
  const { colors, radii, shadows } = useTheme();
  return (
    <Pressable
      onPress={() => {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.floatButton,
        shadows.floating,
        {
          borderRadius: radii.pill,
          backgroundColor: primary ? colors.primary : colors.surface,
          shadowColor: colors.shadow,
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
