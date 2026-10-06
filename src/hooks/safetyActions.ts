import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { ID, ReportReason } from '@/domain/types';
import { type Session, useServices } from '@/services';
import { useToastStore } from '@/state/toastStore';
import { queryKeys } from './queries';

/** Unmatch, block and report, with the cache refreshes and toasts each one needs. */
export function useSafetyActions() {
  const { matches, users } = useServices();
  const queryClient = useQueryClient();
  const toast = useToastStore((s) => s.show);

  /** Read when an action fires, so it never acts for a stale (or not yet loaded) user. */
  const viewerId = (): ID => {
    const id = queryClient.getQueryData<Session | null>(queryKeys.session)?.userId;
    if (!id) throw new Error('Not signed in');
    return id;
  };

  /** Who's shown anywhere (feed, likes, matches, blocked list) may have changed. */
  const refresh = () => {
    for (const key of ['candidates', 'likes', 'matches', 'messages', 'blocked']) {
      void queryClient.invalidateQueries({ queryKey: [key] });
    }
  };
  const failed = () => toast("That didn't go through. Try again.");

  const unmatch = useMutation({
    mutationFn: (matchId: ID) => matches.unmatch(matchId),
    onSuccess: () => {
      refresh();
      toast('Unmatched');
    },
    onError: failed,
  });

  const block = useMutation({
    mutationFn: (userId: ID) => users.block(viewerId(), userId),
    onSuccess: () => {
      refresh();
      toast('Blocked');
    },
    onError: failed,
  });

  const unblock = useMutation({
    mutationFn: (userId: ID) => users.unblock(viewerId(), userId),
    onSuccess: () => {
      refresh();
      toast('Unblocked');
    },
    onError: failed,
  });

  const report = useMutation({
    mutationFn: (input: { reportedId: ID; reason: ReportReason; details?: string }) =>
      users.report({ reporterId: viewerId(), ...input }),
    onSuccess: () => toast('Thanks for letting us know. We’ll take a look.'),
    onError: failed,
  });

  return { unmatch, block, unblock, report };
}
