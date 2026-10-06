import { useQuery } from '@tanstack/react-query';
import { useServices } from '@/services';
import type { ID, Profile } from '@/domain/types';
import { useDevStore } from '@/state/devStore';

export const queryKeys = {
  session: ['session'] as const,
  profile: (userId: ID) => ['profile', userId] as const,
  users: (ids: ID[]) => ['users', [...ids].sort()] as const,
  candidates: (viewerId: ID) => ['candidates', viewerId] as const,
  incomingLikes: (userId: ID) => ['likes', 'incoming', userId] as const,
  quota: (userId: ID) => ['likes', 'quota', userId] as const,
  matches: (userId: ID) => ['matches', userId] as const,
  match: (matchId: ID) => ['match', matchId] as const,
  messages: (matchId: ID) => ['messages', matchId] as const,
  datePlan: (planId: ID) => ['datePlan', planId] as const,
  otherProfile: (userId: ID) => ['profile', 'other', userId] as const,
};

export function useSession() {
  const { auth } = useServices();
  return useQuery({ queryKey: queryKeys.session, queryFn: () => auth.getSession() });
}

/** The signed-in user's id. Undefined until the session loads (or when signed out). */
export function useViewerId(): ID | undefined {
  return useSession().data?.userId;
}

export function useViewerProfile() {
  const { users, pets } = useServices();
  const viewerId = useViewerId();
  return useQuery({
    queryKey: queryKeys.profile(viewerId ?? ''),
    enabled: !!viewerId,
    queryFn: async (): Promise<Profile> => {
      const user = await users.getById(viewerId!);
      if (!user) throw new Error('Signed-in user not found');
      return { user, pets: await pets.listByOwner(user.id) };
    },
  });
}

export function useUsers(ids: ID[]) {
  const { users } = useServices();
  return useQuery({
    queryKey: queryKeys.users(ids),
    enabled: ids.length > 0,
    queryFn: () => users.getMany(ids),
  });
}

export function useCandidates() {
  const { discovery } = useServices();
  const viewerId = useViewerId();
  const forceEmpty = useDevStore((s) => s.forceEmpty.discover);
  return useQuery({
    queryKey: [...queryKeys.candidates(viewerId ?? ''), forceEmpty],
    enabled: !!viewerId,
    queryFn: async () => (forceEmpty ? [] : discovery.getCandidates(viewerId!, { limit: 20 })),
  });
}

export function useIncomingLikes() {
  const { likes } = useServices();
  const viewerId = useViewerId();
  const forceEmpty = useDevStore((s) => s.forceEmpty.likes);
  return useQuery({
    queryKey: [...queryKeys.incomingLikes(viewerId ?? ''), forceEmpty],
    enabled: !!viewerId,
    queryFn: async () => (forceEmpty ? [] : likes.listIncoming(viewerId!)),
  });
}

export function useLikeQuota() {
  const { likes } = useServices();
  const viewerId = useViewerId();
  return useQuery({
    queryKey: queryKeys.quota(viewerId ?? ''),
    enabled: !!viewerId,
    queryFn: () => likes.getQuota(viewerId!),
  });
}

export function useMatches() {
  const { matches } = useServices();
  const viewerId = useViewerId();
  const forceEmpty = useDevStore((s) => s.forceEmpty.matches);
  return useQuery({
    queryKey: [...queryKeys.matches(viewerId ?? ''), forceEmpty],
    enabled: !!viewerId,
    queryFn: async () => (forceEmpty ? [] : matches.list(viewerId!)),
  });
}

/** Anyone's profile (user + pets), e.g. from Likes You or a chat header. */
export function useProfile(userId: ID | undefined) {
  const { users, pets } = useServices();
  return useQuery({
    queryKey: queryKeys.otherProfile(userId ?? ''),
    enabled: !!userId,
    queryFn: async (): Promise<Profile> => {
      const user = await users.getById(userId!);
      if (!user) throw new Error('Profile not found');
      return { user, pets: await pets.listByOwner(user.id) };
    },
  });
}

export function useMatch(matchId: ID | undefined) {
  const { matches } = useServices();
  return useQuery({
    queryKey: queryKeys.match(matchId ?? ''),
    enabled: !!matchId,
    queryFn: () => matches.get(matchId!),
  });
}

export function useMessages(matchId: ID | undefined) {
  const { chat } = useServices();
  return useQuery({
    queryKey: queryKeys.messages(matchId ?? ''),
    enabled: !!matchId,
    queryFn: () => chat.listMessages(matchId!),
  });
}

export function useDatePlan(planId: ID | undefined) {
  const { chat } = useServices();
  return useQuery({
    queryKey: queryKeys.datePlan(planId ?? ''),
    enabled: !!planId,
    queryFn: () => chat.getDatePlan(planId!),
  });
}
