import type { SupabaseClient } from '@supabase/supabase-js';
import type { MatchRepository } from '../types';
import { must } from './db';
import { type MatchRow, matchFromRow, type MatchSummaryRow, matchSummaryFromRow } from './mappers';

export function createSupabaseMatches(supabase: SupabaseClient): MatchRepository {
  return {
    async list(userId) {
      const rows = must(
        await supabase
          .from('match_summaries')
          .select('*')
          .or(`user_a.eq.${userId},user_b.eq.${userId}`),
      ) as MatchSummaryRow[];
      return rows
        .map((row) => matchSummaryFromRow(row, userId))
        .sort((a, b) =>
          (b.lastMessage?.createdAt ?? b.match.createdAt).localeCompare(
            a.lastMessage?.createdAt ?? a.match.createdAt,
          ),
        );
    },

    async get(matchId) {
      const row = must(
        await supabase.from('matches').select('*').eq('id', matchId).maybeSingle(),
      ) as MatchRow | null;
      return row ? matchFromRow(row) : null;
    },

    // Messages and Play Dates go with the match (cascade).
    async unmatch(matchId) {
      must(await supabase.from('matches').delete().eq('id', matchId));
    },
  };
}
