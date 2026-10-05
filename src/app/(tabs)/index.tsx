import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LikeSheet, type LikePreview } from '@/components/LikeSheet';
import { ProfileView } from '@/components/ProfileView';
import { SectionTabs } from '@/components/SectionTabs';
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
  likeTargetOf,
  type ProfileBlock,
  type ProfileSectionKind,
} from '@/domain/profileBlocks';
import type { ID, LikeTarget } from '@/domain/types';
import { useCandidates, useLikeQuota, useViewerId } from '@/hooks/queries';
import { useTheme } from '@/hooks/useTheme';
import { AlreadyLikedError, QuotaExceededError, useServices } from '@/services';
import { useToastStore } from '@/state/toastStore';

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
  const { colors, radii, spacing, shadows } = useTheme();
  const insets = useSafeAreaInsets();
  const viewerId = useViewerId();
  const { likes, discovery } = useServices();
  const queryClient = useQueryClient();
  const toast = useToastStore((s) => s.show);
  const scrollRef = useRef<ScrollView>(null);

  const candidates = useCandidates();
  const quota = useLikeQuota();
  const [handled, setHandled] = useState<ReadonlySet<ID>>(new Set());
  const [liking, setLiking] = useState<LikeDraft | null>(null);

  // Section tabs: where each part of the current profile starts, and which one is in view.
  const contentY = useRef(0);
  const sectionY = useRef<Partial<Record<ProfileSectionKind, number>>>({});
  const [activeTab, setActiveTab] = useState<{ forId: ID | undefined; kind: ProfileSectionKind }>({
    forId: undefined,
    kind: 'person',
  });

  const list = candidates.data;
  const current = list?.find((c) => !handled.has(c.user.id));
  const sections = current ? buildProfileSections(current) : [];
  const activeKind = activeTab.forId === current?.user.id ? activeTab.kind : 'person';
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

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const id = current?.user.id;
    if (!id) return;
    const y = e.nativeEvent.contentOffset.y + 140;
    let kind: ProfileSectionKind = 'person';
    for (const section of sections) {
      const top = contentY.current + (sectionY.current[section.kind] ?? Infinity);
      if (y >= top) kind = section.kind;
    }
    setActiveTab((prev) => (prev.forId === id && prev.kind === kind ? prev : { forId: id, kind }));
  };

  const jumpTo = (kind: ProfileSectionKind) => {
    const y = kind === 'person' ? 0 : contentY.current + (sectionY.current[kind] ?? 0) - 64;
    scrollRef.current?.scrollTo({ y: Math.max(0, y), animated: true });
    setActiveTab({ forId: current?.user.id, kind });
  };

  const skip = () => {
    if (!current || !viewerId) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    markHandled(current.user.id);
    void discovery.pass(viewerId, current.user.id);
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
      setLiking(null);
      void queryClient.invalidateQueries({ queryKey: ['likes'] });
      if (result.match) {
        void queryClient.invalidateQueries({ queryKey: ['matches'] });
        toast(`It's a match with ${draft.name}!`);
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

  return (
    <View style={[styles.flex, { backgroundColor: colors.background }]}>
      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={32}
        stickyHeaderIndices={current && sections.length > 1 ? [1] : undefined}
        contentContainerStyle={{
          paddingTop: insets.top + spacing.md,
          paddingHorizontal: spacing.lg,
          paddingBottom: TAB_BAR_CLEARANCE + insets.bottom + 104,
          gap: spacing.md,
        }}
      >
        <View style={{ gap: spacing.sm }}>
          <Text variant="titleItalic">Discover</Text>
          <View style={[styles.chips, { gap: spacing.sm }]}>
            {q ? (
              <>
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
              </>
            ) : (
              <Skeleton width={150} height={26} radius={13} />
            )}
          </View>
          {q && q.likesRemaining === 0 && q.treatAvailable && (
            <Text variant="small" color="textMuted" accessibilityLiveRegion="polite">
              You&apos;re out of likes for today, but you can still send a Treat.
            </Text>
          )}
        </View>

        {current && sections.length > 1 ? (
          <SectionTabs sections={sections} active={activeKind} onSelect={jumpTo} />
        ) : null}

        {candidates.isPending || (q === undefined && quota.isPending) ? (
          <View style={{ gap: spacing.md }}>
            <Skeleton height={460} radius={radii.xl} />
            <Skeleton height={120} radius={radii.xl} />
          </View>
        ) : candidates.isError ? (
          <ErrorState onRetry={() => void candidates.refetch()} />
        ) : outOfEverything ? (
          <View style={styles.emptyWrap}>
            <EmptyState
              illustration="tennis-ball"
              title="You're out of likes for today"
              body={`Fresh likes and your next Treat arrive ${resetsIn(q?.resetsAt)}. In the meantime, see who's already into you.`}
              actionLabel="See Likes You"
              onAction={() => router.navigate('/likes')}
            />
          </View>
        ) : !current ? (
          list && list.length > 0 ? (
            <View style={{ gap: spacing.md }}>
              <Skeleton height={460} radius={radii.xl} />
            </View>
          ) : (
            <View style={styles.emptyWrap}>
              <EmptyState
                illustration="tennis-ball"
                title="You've seen everyone nearby"
                body="New people and pets join every day. Check back soon, or see who's liked you."
                actionLabel="Refresh"
                onAction={() => void candidates.refetch()}
                secondaryLabel="See Likes You"
                onSecondary={() => router.navigate('/likes')}
              />
            </View>
          )
        ) : (
          <Animated.View
            key={current.user.id}
            entering={FadeIn.duration(250)}
            onLayout={(e) => {
              contentY.current = e.nativeEvent.layout.y;
            }}
          >
            <ProfileView
              profile={current}
              distanceMiles={current.distanceMiles}
              likedYou={current.likedYou}
              onLikePress={openLike}
              onSectionLayout={(kind, y) => {
                sectionY.current[kind] = y;
              }}
            />
          </Animated.View>
        )}
      </ScrollView>

      {current && !outOfEverything && (
        <View
          style={[
            styles.actionBar,
            shadows.floating,
            {
              bottom: barBottom + 76,
              backgroundColor: colors.surface,
              borderColor: colors.border,
              shadowColor: colors.shadow,
              borderRadius: radii.xl,
            },
          ]}
        >
          <Pressable
            onPress={skip}
            accessibilityRole="button"
            accessibilityLabel={`Pass on ${current.user.firstName}`}
            accessibilityHint="Skips this profile and shows the next one"
            style={({ pressed }) => [
              styles.pass,
              {
                borderColor: colors.border,
                backgroundColor: colors.surfaceMuted,
                borderRadius: radii.pill,
                opacity: pressed ? 0.8 : 1,
              },
            ]}
          >
            <Icon name="x" size={22} color={colors.text} />
            <Text variant="bodyStrong">Pass</Text>
          </Pressable>
          <Text variant="small" color="textMuted" style={styles.hint}>
            Tap{' '}
            <Text variant="smallStrong" color="primary">
              ♡ Like
            </Text>{' '}
            on any photo, prompt or pet you love.
          </Text>
        </View>
      )}

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
  actionBar: {
    position: 'absolute',
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 8,
    borderWidth: StyleSheet.hairlineWidth,
  },
  pass: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 18,
    borderWidth: 1.5,
  },
  hint: { flex: 1 },
});
