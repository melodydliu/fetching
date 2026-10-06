import type { SupabaseClient } from '@supabase/supabase-js';
import { config } from '@/config';
import { AlreadyLikedError, type LikeRepository, QuotaExceededError } from '../types';
import { must } from './db';
import { type LikeRow, likeFromRow, type MatchRow, matchFromRow } from './mappers';

/** Limits are enforced by the database; these numbers only drive the counters on screen. */
const startOfUtcDay = (now = new Date()) => {
  const d = new Date(now);
  d.setUTCHours(0, 0, 0, 0);
  return d;
};

export function createSupabaseLikes(supabase: SupabaseClient): LikeRepository {
  const pairMatch = async (a: string, b: string) => {
    const row = must(
      await supabase
        .from('matches')
        .select('*')
        .eq('user_a', a < b ? a : b)
        .eq('user_b', a < b ? b : a)
        .maybeSingle(),
    ) as MatchRow | null;
    return row ? matchFromRow(row) : null;
  };

  return {
    async send(input) {
      if (input.fromUserId === input.toUserId) throw new Error("You can't like yourself");
      const { data, error } = await supabase
        .from('likes')
        .insert({
          from_user_id: input.fromUserId,
          to_user_id: input.toUserId,
          target_type: input.target.type,
          target_id: input.target.id,
          comment: input.comment?.trim() || null,
          is_treat: input.isTreat ?? false,
        })
        .select('*')
        .single();
      if (error) {
        if (error.message.includes('treat_quota_exceeded')) throw new QuotaExceededError('treat');
        if (error.message.includes('like_quota_exceeded')) throw new QuotaExceededError('like');
        if (error.code === '23505') throw new AlreadyLikedError();
        if (error.message.includes('blocked')) throw new Error("You can't like this person.");
        throw new Error(error.message);
      }
      // A mutual like becomes a match inside the database; look it up for the caller.
      const match = await pairMatch(input.fromUserId, input.toUserId);
      return { like: likeFromRow(data as LikeRow), match };
    },

    async listIncoming(userId) {
      const likes = must(
        await supabase.from('likes').select('*').eq('to_user_id', userId).is('removed_at', null),
      ) as LikeRow[];
      if (!likes.length) return [];

      // Not already matched, and only people we can still see (blocked or paused senders drop out).
      const senderIds = [...new Set(likes.map((l) => l.from_user_id))];
      const [matches, visible] = await Promise.all([
        supabase.from('matches').select('user_a, user_b'),
        supabase.from('profiles').select('id').in('id', senderIds),
      ]);
      const matched = new Set(
        (must(matches) as { user_a: string; user_b: string }[]).flatMap((m) => [
          m.user_a,
          m.user_b,
        ]),
      );
      const seen = new Set((must(visible) as { id: string }[]).map((p) => p.id));

      return likes
        .filter((l) => seen.has(l.from_user_id) && !matched.has(l.from_user_id))
        .map(likeFromRow)
        .sort(
          (a, b) => Number(b.isTreat) - Number(a.isTreat) || b.createdAt.localeCompare(a.createdAt),
        );
    },

    async remove(likeId) {
      must(
        await supabase
          .from('likes')
          .update({ removed_at: new Date().toISOString() })
          .eq('id', likeId),
      );
    },

    async likeBack(likeId) {
      const { data, error } = await supabase.rpc('like_back', { p_like_id: likeId });
      if (error) {
        if (error.message.includes('like_gone')) throw new Error('That like is gone');
        if (error.message.includes('blocked')) throw new Error('You can no longer match');
        throw new Error(error.message);
      }
      return matchFromRow(data as MatchRow);
    },

    async getQuota(userId) {
      const dayStart = startOfUtcDay();
      const sent = must(
        await supabase
          .from('likes')
          .select('is_treat')
          .eq('from_user_id', userId)
          .gte('created_at', dayStart.toISOString()),
      ) as { is_treat: boolean }[];
      const likesToday = sent.filter((l) => !l.is_treat).length;
      const treatsToday = sent.filter((l) => l.is_treat).length;
      const resetsAt = new Date(dayStart);
      resetsAt.setUTCDate(resetsAt.getUTCDate() + 1);
      return {
        likesRemaining: Math.max(0, config.dailyLikeLimit - likesToday),
        likesLimit: config.dailyLikeLimit,
        treatAvailable: treatsToday < config.dailyTreatLimit,
        resetsAt: resetsAt.toISOString(),
      };
    },
  };
}
