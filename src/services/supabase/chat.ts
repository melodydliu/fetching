import type { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js';
import type { ChatRepository } from '../types';
import { must } from './db';
import { datePlanFromRow, type DatePlanRow, messageFromRow, type MessageRow } from './mappers';

/** How long an unused typing channel stays open before we hang up (people often type again). */
const TYPING_CHANNEL_IDLE_MS = 5000;

type TypingListener = (userId: string, typing: boolean) => void;

interface TypingChannel {
  channel: RealtimeChannel;
  listeners: Set<TypingListener>;
  ready: Promise<void>;
  idleTimer?: ReturnType<typeof setTimeout>;
}

export function createSupabaseChat(supabase: SupabaseClient): ChatRepository {
  // One typing channel per chat, shared by listening and sending, opened on first use.
  const typingChannels = new Map<string, TypingChannel>();

  const typingChannel = (matchId: string): TypingChannel => {
    const existing = typingChannels.get(matchId);
    if (existing) {
      clearTimeout(existing.idleTimer);
      return existing;
    }
    const listeners = new Set<TypingListener>();
    // Private: only the two people in the match are allowed in (see the typing policies).
    const channel = supabase.channel(`typing:${matchId}`, {
      config: { private: true, broadcast: { self: false } },
    });
    channel.on('broadcast', { event: 'typing' }, ({ payload }) => {
      const { userId, typing } = payload as { userId: string; typing: boolean };
      listeners.forEach((l) => l(userId, typing));
    });
    const ready = new Promise<void>((resolve, reject) => {
      channel.subscribe((status) => {
        if (status === 'SUBSCRIBED') resolve();
        else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          reject(new Error('typing channel unavailable'));
        }
      });
    });
    ready.catch(() => typingChannels.delete(matchId));
    const entry: TypingChannel = { channel, listeners, ready };
    typingChannels.set(matchId, entry);
    return entry;
  };

  const releaseIfIdle = (matchId: string, entry: TypingChannel) => {
    if (entry.listeners.size > 0) return;
    clearTimeout(entry.idleTimer);
    entry.idleTimer = setTimeout(() => {
      if (entry.listeners.size === 0 && typingChannels.get(matchId) === entry) {
        typingChannels.delete(matchId);
        void supabase.removeChannel(entry.channel);
      }
    }, TYPING_CHANNEL_IDLE_MS);
  };

  const planFromRow = (row: unknown) => datePlanFromRow(row as DatePlanRow);

  return {
    async listMessages(matchId) {
      const rows = must(
        await supabase
          .from('messages')
          .select('*')
          .eq('match_id', matchId)
          .order('created_at', { ascending: true }),
      ) as MessageRow[];
      return rows.map(messageFromRow);
    },

    async sendText(matchId, senderId, text) {
      const row = must(
        await supabase
          .from('messages')
          .insert({ match_id: matchId, sender_id: senderId, kind: 'text', body: text.trim() })
          .select('*')
          .single(),
      ) as MessageRow;
      return messageFromRow(row);
    },

    async markRead(matchId, readerId) {
      must(
        await supabase
          .from('messages')
          .update({ read_at: new Date().toISOString() })
          .eq('match_id', matchId)
          .neq('sender_id', readerId)
          .is('read_at', null),
      );
    },

    // New messages (including Play Date cards) stream from the database; Realtime applies the
    // same read rules, so only people in the match receive them.
    subscribe(matchId, onMessage, onReady) {
      const channel = supabase
        .channel(`messages:${matchId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: `match_id=eq.${matchId}`,
          },
          (payload) => onMessage(messageFromRow(payload.new as MessageRow)),
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') onReady?.();
        });
      return () => {
        void supabase.removeChannel(channel);
      };
    },

    // Typing is best effort: a failure to send or listen must never get in the way of chatting.
    async setTyping(matchId, userId, typing) {
      const entry = typingChannel(matchId);
      try {
        await entry.ready;
        await entry.channel.send({
          type: 'broadcast',
          event: 'typing',
          payload: { userId, typing },
        });
      } finally {
        releaseIfIdle(matchId, entry);
      }
    },

    subscribeTyping(matchId, onTyping) {
      const entry = typingChannel(matchId);
      entry.listeners.add(onTyping);
      return () => {
        entry.listeners.delete(onTyping);
        releaseIfIdle(matchId, entry);
      };
    },

    // The database drops the plan's card into the chat by itself; fetch it for the caller.
    async proposeDate(input) {
      const plan = planFromRow(
        must(
          await supabase
            .from('date_plans')
            .insert({
              match_id: input.matchId,
              proposer_id: input.proposerId,
              kind: input.kind,
              custom_label: input.kind === 'custom' ? (input.customLabel ?? null) : null,
              location: input.location ?? null,
              starts_at: input.startsAt,
              note: input.note ?? null,
            })
            .select('*')
            .single(),
        ),
      );
      const message = must(
        await supabase.from('messages').select('*').eq('date_plan_id', plan.id).single(),
      ) as MessageRow;
      return { plan, message: messageFromRow(message) };
    },

    async getDatePlan(planId) {
      const row = must(
        await supabase.from('date_plans').select('*').eq('id', planId).maybeSingle(),
      );
      return row ? planFromRow(row) : null;
    },

    // Only the proposer can edit; the database resets it to "proposed" for the other person.
    async updateDatePlan(planId, _editorId, input) {
      return planFromRow(
        must(
          await supabase
            .from('date_plans')
            .update({
              kind: input.kind,
              custom_label: input.kind === 'custom' ? (input.customLabel ?? null) : null,
              location: input.location ?? null,
              starts_at: input.startsAt,
              note: input.note ?? null,
            })
            .eq('id', planId)
            .select('*')
            .single(),
        ),
      );
    },

    async deleteDatePlan(planId) {
      const removed = must(
        await supabase.from('date_plans').delete().eq('id', planId).select('id'),
      ) as { id: string }[];
      if (!removed.length) throw new Error('Only the person who planned it can delete');
    },

    // The database records who answered (always the caller) and enforces who may change what.
    async respondToDatePlan(planId, response, options) {
      const patch: Record<string, unknown> = { status: response };
      if (options.note !== undefined) patch.note = options.note;
      if (options.newStartsAt !== undefined) patch.starts_at = options.newStartsAt;
      return planFromRow(
        must(await supabase.from('date_plans').update(patch).eq('id', planId).select('*').single()),
      );
    },
  };
}
