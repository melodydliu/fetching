import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DatePlanCard } from '@/components/chat/DatePlanCard';
import { Illustration } from '@/components/illustrations/Illustration';
import { DateTimePicker } from '@/components/chat/DateTimePicker';
import { chatListLayout } from '@/components/chat/listLayout';
import { MessageBubble } from '@/components/chat/MessageBubble';
import { TypingIndicator } from '@/components/chat/TypingIndicator';
import { SafetySheet } from '@/components/safety/SafetySheet';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Icon } from '@/components/ui/Icon';
import { Skeleton } from '@/components/ui/Skeleton';
import { Text } from '@/components/ui/Text';
import { TextField } from '@/components/ui/TextField';
import { buildChatItems, type ChatItem } from '@/domain/chatItems';
import { MAX_DATE_NOTE } from '@/domain/datePlans';
import type { DatePlan, ID, Message } from '@/domain/types';
import {
  queryKeys,
  useDatePlan,
  useMatch,
  useMessages,
  useProfile,
  useViewerId,
} from '@/hooks/queries';
import { useTheme } from '@/hooks/useTheme';
import { useServices } from '@/services';
import { useToastStore } from '@/state/toastStore';
import { hitSize } from '@/theme';
import { confirmAction } from '@/utils/confirm';

const MAX_MESSAGE = 1000;
/** Re-send "typing" at most this often while the draft keeps changing. */
const TYPING_REFRESH_MS = 3000;
/** Stop saying we're typing after this long without a keystroke. */
const TYPING_IDLE_MS = 4000;
/** If a "stopped typing" never arrives, hide their indicator after this long. */
const TYPING_EXPIRE_MS = 8000;

const timeOf = (iso: string) =>
  new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });

function PlanMessage({
  planId,
  viewerId,
  participantIds,
  otherName,
  onSuggest,
}: {
  planId: ID;
  viewerId: ID;
  participantIds: readonly ID[];
  otherName: string;
  onSuggest: (plan: DatePlan) => void;
}) {
  const { chat } = useServices();
  const queryClient = useQueryClient();
  const toast = useToastStore((s) => s.show);
  const plan = useDatePlan(planId);

  const respond = useMutation({
    mutationFn: (response: 'accepted' | 'declined') =>
      chat.respondToDatePlan(planId, response, { responderId: viewerId }),
    onSuccess: (updated) => {
      queryClient.setQueryData(queryKeys.datePlan(planId), updated);
      void Haptics.notificationAsync(
        updated.status === 'accepted'
          ? Haptics.NotificationFeedbackType.Success
          : Haptics.NotificationFeedbackType.Warning,
      );
      toast(updated.status === 'accepted' ? 'Play Date accepted' : 'Play Date declined');
    },
    onError: () => toast("Couldn't update that. Try again."),
  });

  const remove = useMutation({
    mutationFn: () => chat.deleteDatePlan(planId, viewerId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['messages'] });
      void queryClient.invalidateQueries({ queryKey: ['matches'] });
      toast('Play Date deleted');
    },
    onError: () => toast("Couldn't delete that. Try again."),
  });

  const confirmDelete = () =>
    confirmAction({
      title: 'Delete this Play Date?',
      message: `${otherName} will no longer see it in the chat.`,
      confirmLabel: 'Delete',
      cancelLabel: 'Keep it',
      destructive: true,
      onConfirm: () => remove.mutate(),
    });

  if (plan.isPending) return <Skeleton height={140} radius={28} />;
  if (!plan.data) return null;
  return (
    <DatePlanCard
      plan={plan.data}
      viewerId={viewerId}
      participantIds={participantIds}
      otherName={otherName}
      busy={respond.isPending || remove.isPending}
      onAccept={() => respond.mutate('accepted')}
      onDecline={() => respond.mutate('declined')}
      onSuggest={() => onSuggest(plan.data!)}
      onEdit={() =>
        router.push({
          pathname: '/play-date/[matchId]',
          params: { matchId: plan.data!.matchId, planId },
        })
      }
      onDelete={confirmDelete}
    />
  );
}

function SuggestChangeSheet({
  plan,
  viewerId,
  onClose,
}: {
  plan: DatePlan;
  viewerId: ID;
  onClose: () => void;
}) {
  const { colors, radii, spacing } = useTheme();
  const insets = useSafeAreaInsets();
  const { chat } = useServices();
  const queryClient = useQueryClient();
  const toast = useToastStore((s) => s.show);
  const [startsAt, setStartsAt] = useState<Date | null>(null);
  const [note, setNote] = useState('');

  const suggest = useMutation({
    mutationFn: () =>
      chat.respondToDatePlan(plan.id, 'change_suggested', {
        responderId: viewerId,
        newStartsAt: startsAt!.toISOString(),
        note: note.trim() || undefined,
      }),
    onSuccess: (updated) => {
      queryClient.setQueryData(queryKeys.datePlan(updated.id), updated);
      toast('New time suggested');
      onClose();
    },
    onError: () => toast("Couldn't send that. Try again."),
  });

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={[styles.backdrop, { backgroundColor: colors.overlay }]}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Close"
        />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View
            style={{
              backgroundColor: colors.background,
              borderTopLeftRadius: radii.xl,
              borderTopRightRadius: radii.xl,
              padding: spacing.lg,
              paddingBottom: insets.bottom + spacing.lg,
              gap: spacing.lg,
            }}
          >
            <Text variant="title">Suggest a new time</Text>
            <DateTimePicker value={startsAt} onChange={setStartsAt} />
            <TextField
              label="Add a note (optional)"
              value={note}
              onChangeText={setNote}
              maxLength={MAX_DATE_NOTE}
              placeholder="Does later work better for the pups?"
            />
            <Button
              label="Send suggestion"
              onPress={() => suggest.mutate()}
              disabled={!startsAt}
              loading={suggest.isPending}
            />
            <Button label="Cancel" variant="ghost" onPress={onClose} />
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

export default function ChatScreen() {
  const { matchId } = useLocalSearchParams<{ matchId: string }>();
  const { colors, radii, spacing } = useTheme();
  const insets = useSafeAreaInsets();
  const viewerId = useViewerId();
  const { chat } = useServices();
  const queryClient = useQueryClient();
  const toast = useToastStore((s) => s.show);

  const match = useMatch(matchId);
  const otherId = match.data?.userIds.find((id) => id !== viewerId);
  const other = useProfile(otherId);
  const messages = useMessages(matchId);
  const [draft, setDraft] = useState('');
  const [suggesting, setSuggesting] = useState<DatePlan | null>(null);
  const [safetyOpen, setSafetyOpen] = useState(false);
  const [otherTyping, setOtherTyping] = useState(false);

  // Mocked realtime: new messages (from the Dev Menu or the other person) land here.
  useEffect(() => {
    if (!matchId) return undefined;
    return chat.subscribe(
      matchId,
      (message) => {
        queryClient.setQueryData<Message[]>(queryKeys.messages(matchId), (prev) =>
          prev?.some((m) => m.id === message.id) ? prev : [...(prev ?? []), message],
        );
        if (message.senderId !== viewerId) {
          setOtherTyping(false);
          void Haptics.selectionAsync();
        }
        void queryClient.invalidateQueries({ queryKey: ['matches'] });
      },
      // Live now: refetch so anything sent while we were connecting isn't missed.
      () => void queryClient.invalidateQueries({ queryKey: queryKeys.messages(matchId) }),
    );
  }, [matchId, viewerId, chat, queryClient]);

  // Their typing indicator, with a safety expiry in case "stopped" never arrives.
  useEffect(() => {
    if (!matchId || !otherId) return undefined;
    let expire: ReturnType<typeof setTimeout> | undefined;
    const off = chat.subscribeTyping(matchId, (userId, typing) => {
      if (userId !== otherId) return;
      clearTimeout(expire);
      setOtherTyping(typing);
      if (typing) expire = setTimeout(() => setOtherTyping(false), TYPING_EXPIRE_MS);
    });
    return () => {
      off();
      clearTimeout(expire);
      setOtherTyping(false);
    };
  }, [matchId, otherId, chat]);

  // Our typing, sent best effort: refreshed while typing, cleared when idle, sent or left.
  const lastTypingSent = useRef(0);
  const idleTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const stopTyping = () => {
    clearTimeout(idleTimer.current);
    if (lastTypingSent.current && matchId && viewerId) {
      lastTypingSent.current = 0;
      void chat.setTyping(matchId, viewerId, false).catch(() => undefined);
    }
  };
  const onDraftChange = (text: string) => {
    setDraft(text);
    if (!matchId || !viewerId) return;
    if (!text.trim()) return stopTyping();
    const now = Date.now();
    if (now - lastTypingSent.current > TYPING_REFRESH_MS) {
      lastTypingSent.current = now;
      void chat.setTyping(matchId, viewerId, true).catch(() => undefined);
    }
    clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(stopTyping, TYPING_IDLE_MS);
  };
  useEffect(() => stopTyping, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Having the chat open means everything in it is read.
  const messageCount = messages.data?.length ?? 0;
  useEffect(() => {
    if (matchId && viewerId && messageCount > 0) {
      void chat
        .markRead(matchId, viewerId)
        .then(() => queryClient.invalidateQueries({ queryKey: ['matches'] }));
    }
  }, [matchId, viewerId, messageCount, chat, queryClient]);

  const send = useMutation({
    mutationFn: (text: string) => chat.sendText(matchId, viewerId!, text),
    onSuccess: (message) => {
      queryClient.setQueryData<Message[]>(queryKeys.messages(matchId), (prev) =>
        prev?.some((m) => m.id === message.id) ? prev : [...(prev ?? []), message],
      );
      void queryClient.invalidateQueries({ queryKey: ['matches'] });
    },
    onError: (_e, text) => {
      setDraft((d) => d || text);
      toast("Message didn't send. Try again.");
    },
  });

  const submit = () => {
    const text = draft.trim();
    if (!text || !viewerId) return;
    setDraft('');
    stopTyping();
    send.mutate(text);
  };

  // Newest first for the inverted list.
  const data = useMemo(() => buildChatItems(messages.data ?? []).reverse(), [messages.data]);
  const listLayout = chatListLayout(data.length, spacing.lg, spacing.sm);
  const name = other.data?.user.firstName ?? '';
  const participantIds = match.data?.userIds ?? [];

  const loading = match.isPending || messages.isPending || (!!otherId && other.isPending);
  const failed = match.isError || messages.isError || other.isError;
  const gone = !match.isPending && !match.isError && !match.data;

  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + spacing.sm,
            paddingHorizontal: spacing.md,
            paddingBottom: spacing.sm,
            borderBottomColor: colors.border,
            gap: spacing.sm,
          },
        ]}
      >
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          style={styles.iconButton}
        >
          <Icon name="chevron-left" color={colors.text} />
        </Pressable>
        {other.data ? (
          <Pressable
            onPress={() =>
              router.push({
                pathname: '/user/[id]',
                params: { id: other.data.user.id, matchId },
              })
            }
            accessibilityRole="button"
            accessibilityLabel={`View ${name}'s profile`}
            style={[styles.who, { gap: spacing.sm }]}
          >
            <Avatar url={other.data.user.photos[0]!.url} name={name} size={40} />
            <Text variant="heading" numberOfLines={1} style={styles.flex}>
              {name}
            </Text>
          </Pressable>
        ) : (
          <View style={styles.flex} />
        )}
        {other.data ? (
          <Pressable
            onPress={() => setSafetyOpen(true)}
            accessibilityRole="button"
            accessibilityLabel={`More options for ${name}`}
            style={styles.iconButton}
          >
            <Icon name="more" color={colors.text} />
          </Pressable>
        ) : null}
      </View>

      {loading ? (
        <View style={{ padding: spacing.lg, gap: spacing.md }}>
          <Skeleton height={48} radius={20} width="60%" />
          <Skeleton height={48} radius={20} width="45%" style={{ alignSelf: 'flex-end' }} />
          <Skeleton height={48} radius={20} width="70%" />
        </View>
      ) : failed ? (
        <View style={{ padding: spacing.lg }}>
          <ErrorState
            onRetry={() => {
              void match.refetch();
              void messages.refetch();
              void other.refetch();
            }}
          />
        </View>
      ) : gone ? (
        <View style={{ padding: spacing.lg, flex: 1 }}>
          <EmptyState
            illustration="empty-match-gone"
            title="This match is no longer here"
            body="They may have unmatched, or the chat was removed."
            actionLabel="Back to Matches"
            onAction={() => router.navigate('/matches')}
          />
        </View>
      ) : (
        <>
          <FlatList
            inverted
            data={data}
            keyExtractor={(item: ChatItem) => item.key}
            style={styles.flex}
            contentContainerStyle={listLayout.contentContainerStyle}
            keyboardShouldPersistTaps="handled"
            // Inverted list: the header renders below the newest message. It grows to fill spare
            // room, which top-aligns a short thread; the typing dots sit right under the message.
            ListHeaderComponentStyle={listLayout.headerStyle}
            ListHeaderComponent={
              <View style={styles.flex}>
                {otherTyping ? <TypingIndicator name={name} /> : null}
              </View>
            }
            ListEmptyComponent={
              <View style={[styles.empty, { gap: spacing.sm }]}>
                <Illustration name="empty-chat-thread" area={200 * 160} />
                <Text variant="heading" align="center">
                  You matched with {name}!
                </Text>
                <Text color="textMuted" align="center">
                  Say hi, or plan a Play Date to get the pets together.
                </Text>
              </View>
            }
            renderItem={({ item }) =>
              item.type === 'day' ? (
                <Text variant="caption" color="textSubtle" align="center" style={styles.day}>
                  {item.label}
                </Text>
              ) : item.message.kind === 'date_plan' && item.message.datePlanId ? (
                <PlanMessage
                  planId={item.message.datePlanId}
                  viewerId={viewerId!}
                  participantIds={participantIds}
                  otherName={name}
                  onSuggest={setSuggesting}
                />
              ) : (
                <MessageBubble
                  text={item.message.text ?? ''}
                  mine={item.message.senderId === viewerId}
                  time={timeOf(item.message.createdAt)}
                />
              )
            }
          />
          <View
            style={[
              styles.composer,
              {
                borderTopColor: colors.border,
                backgroundColor: colors.background,
                paddingHorizontal: spacing.md,
                paddingTop: spacing.sm,
                paddingBottom: Math.max(insets.bottom, spacing.sm),
                gap: spacing.sm,
              },
            ]}
          >
            <Pressable
              onPress={() => router.push(`/play-date/${matchId}`)}
              accessibilityRole="button"
              accessibilityLabel="Plan a Play Date"
              style={[
                styles.iconButton,
                { backgroundColor: colors.accent, borderRadius: radii.pill },
              ]}
            >
              <Icon name="calendar" size={22} color={colors.onAccent} />
            </Pressable>
            <TextInput
              value={draft}
              onChangeText={onDraftChange}
              placeholder="Message"
              placeholderTextColor={colors.textSubtle}
              accessibilityLabel="Message"
              multiline
              maxLength={MAX_MESSAGE}
              style={[
                styles.input,
                {
                  color: colors.text,
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  borderRadius: radii.xl,
                  paddingHorizontal: spacing.lg,
                },
              ]}
            />
            <Pressable
              onPress={submit}
              disabled={!draft.trim()}
              accessibilityRole="button"
              accessibilityLabel="Send message"
              accessibilityState={{ disabled: !draft.trim() }}
              style={[
                styles.iconButton,
                {
                  backgroundColor: colors.primary,
                  borderRadius: radii.pill,
                  opacity: draft.trim() ? 1 : 0.4,
                },
              ]}
            >
              <Icon name="send" size={22} color={colors.onPrimary} />
            </Pressable>
          </View>
        </>
      )}

      {other.data ? (
        <SafetySheet
          visible={safetyOpen}
          userId={other.data.user.id}
          name={name}
          matchId={matchId}
          onClose={() => setSafetyOpen(false)}
          onDone={(outcome) => outcome !== 'reported' && router.navigate('/matches')}
        />
      ) : null}

      {viewerId && suggesting ? (
        <SuggestChangeSheet
          plan={suggesting}
          viewerId={viewerId}
          onClose={() => setSuggesting(null)}
        />
      ) : null}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  who: { flex: 1, flexDirection: 'row', alignItems: 'center', minHeight: hitSize },
  iconButton: { width: hitSize, height: hitSize, alignItems: 'center', justifyContent: 'center' },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  input: {
    flex: 1,
    minHeight: hitSize,
    maxHeight: 120,
    borderWidth: 1.5,
    fontSize: 16,
    paddingTop: 12,
    paddingBottom: 12,
  },
  // The list is inverted, so flip the placeholder back upright.
  empty: { paddingVertical: 48, alignItems: 'center', transform: [{ scaleY: -1 }] },
  day: { marginVertical: 8 },
  backdrop: { flex: 1, justifyContent: 'flex-end' },
});
