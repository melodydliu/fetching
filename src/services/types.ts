/**
 * Service interfaces: the only thing UI code depends on.
 * Mock implementations live in `./mock`; a Supabase set can be added later and
 * selected in `./index.ts` without touching any screen.
 */
import type { Compatibility, LikedYou } from '@/domain/matching';
import type {
  DatePlan,
  DatePlanStatus,
  ID,
  Like,
  LikeTarget,
  Match,
  Message,
  Pet,
  Photo,
  Profile,
  PlayDateKind,
  Report,
  ReportReason,
  User,
} from '@/domain/types';

export type Unsubscribe = () => void;

export interface Session {
  userId: ID;
}

export type SignInCredentials = { phone: string } | { email: string };

export interface AccountInfo {
  method: 'phone' | 'email';
  /** The phone number or email they signed up with. */
  identifier: string;
  createdAt: string;
}

export interface AuthService {
  getSession(): Promise<Session | null>;
  /** Existing account. */
  signIn(credentials: SignInCredentials): Promise<Session>;
  /** New account: creates a bare profile (`onboardingComplete: false`) and signs in. */
  signUp(credentials: SignInCredentials): Promise<Session>;
  signOut(): Promise<void>;
  /** How the signed-in user logs in, for the Account screen. */
  getAccount(): Promise<AccountInfo | null>;
  deleteAccount(): Promise<void>;
}

export type NewUser = Omit<User, 'id' | 'createdAt' | 'lastActiveAt'>;

export interface UserRepository {
  getById(id: ID): Promise<User | null>;
  getMany(ids: ID[]): Promise<User[]>;
  create(input: NewUser): Promise<User>;
  update(id: ID, patch: Partial<Omit<User, 'id'>>): Promise<User>;
  setPaused(id: ID, paused: boolean): Promise<User>;
  block(blockerId: ID, blockedId: ID): Promise<void>;
  unblock(blockerId: ID, blockedId: ID): Promise<void>;
  listBlockedIds(userId: ID): Promise<ID[]>;
  report(input: {
    reporterId: ID;
    reportedId: ID;
    reason: ReportReason;
    details?: string;
  }): Promise<Report>;
}

export type NewPet = Omit<Pet, 'id'>;

export interface PetRepository {
  listByOwner(ownerId: ID): Promise<Pet[]>;
  create(input: NewPet): Promise<Pet>;
  update(id: ID, patch: Partial<Omit<Pet, 'id' | 'ownerId'>>): Promise<Pet>;
  remove(id: ID): Promise<void>;
}

export interface Candidate extends Profile {
  distanceMiles: number;
  /** Pet compatibility with the viewer, with reasons for the badge. */
  compatibility: Compatibility;
  /** Set when this person already liked the viewer. */
  likedYou: LikedYou | null;
}

export interface DiscoveryService {
  /** Next profiles for the viewer, best first. */
  getCandidates(viewerId: ID, options?: { limit?: number }): Promise<Candidate[]>;
  /** Skip (X). The profile won't be shown again. */
  pass(viewerId: ID, targetUserId: ID): Promise<void>;
  /** Undo a Skip: the profile can be shown again. */
  unpass(viewerId: ID, targetUserId: ID): Promise<void>;
}

export interface LikeQuota {
  likesRemaining: number;
  likesLimit: number;
  treatAvailable: boolean;
  resetsAt: string;
}

export interface SendLikeInput {
  fromUserId: ID;
  toUserId: ID;
  target: LikeTarget;
  comment?: string;
  isTreat?: boolean;
}

export interface SendLikeResult {
  like: Like;
  /** Present when the like was mutual. */
  match: Match | null;
}

export class QuotaExceededError extends Error {
  constructor(kind: 'like' | 'treat') {
    super(kind === 'like' ? 'Out of likes for today' : 'Treat already used today');
    this.name = 'QuotaExceededError';
  }
}

export class AlreadyLikedError extends Error {
  constructor() {
    super('You already liked this person');
    this.name = 'AlreadyLikedError';
  }
}

export interface LikeRepository {
  send(input: SendLikeInput): Promise<SendLikeResult>;
  /** People who liked `userId` and haven't been matched or removed. Treats first, then newest. */
  listIncoming(userId: ID): Promise<Like[]>;
  /** Remove an incoming like. */
  remove(likeId: ID): Promise<void>;
  /**
   * Like someone back from Likes You: always creates the match and doesn't spend a daily like
   * (they already spent theirs on you).
   */
  likeBack(likeId: ID, viewerId: ID): Promise<Match>;
  getQuota(userId: ID): Promise<LikeQuota>;
}

export interface MatchSummary {
  match: Match;
  otherUserId: ID;
  lastMessage?: Message;
  /** The other person spoke last and is waiting for a reply. */
  yourTurn: boolean;
  /** Nobody has said anything yet. */
  isNew: boolean;
}

export interface MatchRepository {
  list(userId: ID): Promise<MatchSummary[]>;
  get(matchId: ID): Promise<Match | null>;
  unmatch(matchId: ID): Promise<void>;
}

export interface ProposeDateInput {
  matchId: ID;
  proposerId: ID;
  kind: PlayDateKind;
  customLabel?: string;
  location?: string;
  startsAt: string;
  note?: string;
}

export type UpdateDateInput = Omit<ProposeDateInput, 'matchId' | 'proposerId'>;

export interface ChatRepository {
  listMessages(matchId: ID): Promise<Message[]>;
  sendText(matchId: ID, senderId: ID, text: string): Promise<Message>;
  markRead(matchId: ID, readerId: ID): Promise<void>;
  /** Mocked realtime. Real implementation will use Supabase Realtime. */
  subscribe(matchId: ID, onMessage: (message: Message) => void): Unsubscribe;
  /** Tell the other person you started or stopped typing. Best effort: failures are ignored. */
  setTyping(matchId: ID, userId: ID, typing: boolean): Promise<void>;
  /** Fires when the other person starts/stops typing. Also fires once with the current state. */
  subscribeTyping(matchId: ID, onTyping: (userId: ID, typing: boolean) => void): Unsubscribe;
  proposeDate(input: ProposeDateInput): Promise<{ plan: DatePlan; message: Message }>;
  getDatePlan(planId: ID): Promise<DatePlan | null>;
  /** Proposer only. Replaces the details and puts the plan back to "proposed" for the other person. */
  updateDatePlan(planId: ID, editorId: ID, input: UpdateDateInput): Promise<DatePlan>;
  /** Proposer only. Removes the plan and its card from the chat. */
  deleteDatePlan(planId: ID, deleterId: ID): Promise<void>;
  respondToDatePlan(
    planId: ID,
    response: Exclude<DatePlanStatus, 'proposed'>,
    options: { responderId: ID; note?: string; newStartsAt?: string },
  ): Promise<DatePlan>;
}

export interface MediaService {
  /** Stores a local image and returns the Photo to attach to a profile or pet. */
  upload(localUri: string): Promise<Photo>;
  remove(photoId: ID): Promise<void>;
}

/** Mock-only controls surfaced in the hidden Dev Menu. */
export interface DevTools {
  listUsers(): Promise<Pick<User, 'id' | 'firstName' | 'kind'>[]>;
  getActiveUserId(): ID | null;
  switchUser(userId: ID): Promise<void>;
  reset(): Promise<void>;
  /** Override today's remaining likes / Treat to test limits. Pass null to clear. */
  setQuota(quota: { likes?: number; treatAvailable?: boolean } | null): Promise<void>;
  /** Each returns a short description of what happened, for a toast. */
  simulateIncomingLike(): Promise<string>;
  simulateNewMatch(): Promise<string>;
  simulateIncomingMessage(): Promise<string>;
  /** The other person in your most recent chat "types" for ~15s (open the chat to see it). */
  simulateTyping(): Promise<string>;
  /** The other person proposes a Play Date in a random match. */
  simulateIncomingDatePlan(): Promise<string>;
  /** The other person answers the viewer's latest open Play Date plan. */
  simulateDateReply(): Promise<string>;
}

export interface Services {
  auth: AuthService;
  users: UserRepository;
  pets: PetRepository;
  discovery: DiscoveryService;
  likes: LikeRepository;
  matches: MatchRepository;
  chat: ChatRepository;
  media: MediaService;
  /** Only defined for mock services. */
  dev?: DevTools;
}
