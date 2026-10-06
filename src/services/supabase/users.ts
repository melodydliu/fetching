import type { SupabaseClient } from '@supabase/supabase-js';
import type { User } from '@/domain/types';
import { newId } from '@/utils/id';
import type { UserRepository } from '../types';
import { must, syncPhotos } from './db';
import { PROFILE_SELECT, type ProfileRow, profilePatchToRow, userFromRow } from './mappers';

export function createSupabaseUsers(supabase: SupabaseClient): UserRepository {
  /** Coordinates are readable only by their owner, so this returns at most the viewer's own row. */
  const ownCoords = async (ids: string[]) => {
    const rows = must(
      await supabase.from('profile_locations').select('user_id, lat, lng').in('user_id', ids),
    ) as { user_id: string; lat: number; lng: number }[];
    return new Map(rows.map((r) => [r.user_id, { lat: r.lat, lng: r.lng }]));
  };

  const getMany = async (ids: string[]): Promise<User[]> => {
    if (!ids.length) return [];
    const rows = must(
      await supabase.from('profiles').select(PROFILE_SELECT).in('id', ids),
    ) as unknown as ProfileRow[];
    const coords = await ownCoords(ids);
    // Keep the caller's order; people we can't see (blocked, paused, deleted) are skipped.
    return ids.flatMap((id) => {
      const row = rows.find((r) => r.id === id);
      return row ? [userFromRow(row, coords.get(id))] : [];
    });
  };

  const getById = async (id: string) => (await getMany([id]))[0] ?? null;

  const repo: UserRepository = {
    getById,
    getMany,

    create: () => Promise.reject(new Error('Accounts are created by auth.signUp')),

    async update(id, patch) {
      const row = profilePatchToRow(patch);
      if (Object.keys(row).length) must(await supabase.from('profiles').update(row).eq('id', id));
      if (patch.location) {
        must(
          await supabase.from('profile_locations').upsert({
            user_id: id,
            lat: patch.location.lat,
            lng: patch.location.lng,
            updated_at: new Date().toISOString(),
          }),
        );
      }
      if (patch.photos) await syncPhotos(supabase, id, null, patch.photos);
      if (patch.promptAnswers) {
        const answers = patch.promptAnswers;
        const existing = must(
          await supabase.from('prompt_answers').select('id').eq('user_id', id),
        ) as { id: string }[];
        const keep = new Set(answers.map((a) => a.id));
        const gone = existing.filter((r) => !keep.has(r.id)).map((r) => r.id);
        if (gone.length) must(await supabase.from('prompt_answers').delete().in('id', gone));
        if (answers.length) {
          must(
            await supabase.from('prompt_answers').upsert(
              answers.map((a, position) => ({
                id: a.id,
                user_id: id,
                prompt_id: a.promptId,
                answer: a.answer,
                position,
              })),
              { onConflict: 'id' },
            ),
          );
        }
      }
      const fresh = await getById(id);
      if (!fresh) throw new Error('Profile not found');
      return fresh;
    },

    setPaused: (id, paused) => repo.update(id, { paused }),

    async block(blockerId, blockedId) {
      must(
        await supabase
          .from('blocks')
          .upsert(
            { blocker_id: blockerId, blocked_id: blockedId },
            { onConflict: 'blocker_id,blocked_id', ignoreDuplicates: true },
          ),
      );
    },

    async unblock(blockerId, blockedId) {
      must(
        await supabase
          .from('blocks')
          .delete()
          .eq('blocker_id', blockerId)
          .eq('blocked_id', blockedId),
      );
    },

    async listBlockedIds(userId) {
      const rows = must(
        await supabase.from('blocks').select('blocked_id').eq('blocker_id', userId),
      ) as { blocked_id: string }[];
      return rows.map((r) => r.blocked_id);
    },

    // Reports are write-only for users (no read policy), so build the receipt locally.
    async report(input) {
      must(
        await supabase.from('reports').insert({
          reporter_id: input.reporterId,
          reported_id: input.reportedId,
          reason: input.reason,
          details: input.details ?? null,
        }),
      );
      return { ...input, id: newId('report'), createdAt: new Date().toISOString() };
    },
  };
  return repo;
}
