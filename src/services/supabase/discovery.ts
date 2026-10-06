import type { SupabaseClient } from '@supabase/supabase-js';
import { buildFeed, type LikedYou } from '@/domain/matching';
import type { ID, Pet, Profile } from '@/domain/types';
import type { Candidate, DiscoveryService, UserRepository } from '../types';
import { must } from './db';
import { PET_SELECT, petFromRow, type PetRow } from './mappers';

/**
 * Same pipeline as the mock: hard filters, then ranking, via the pure `buildFeed`. The one
 * difference is distance: coordinates are private, so the database tells us who is in range
 * of BOTH people and how many miles away (rounded up), and we hand that to `buildFeed`.
 */
export function createSupabaseDiscovery(
  supabase: SupabaseClient,
  users: UserRepository,
): DiscoveryService {
  const petsByOwner = async (ownerIds: ID[]) => {
    const grouped = new Map<ID, Pet[]>();
    if (!ownerIds.length) return grouped;
    const rows = must(
      await supabase
        .from('pets')
        .select(PET_SELECT)
        .in('owner_id', ownerIds)
        .order('position', { ascending: true }),
    ) as unknown as PetRow[];
    rows.map(petFromRow).forEach((pet) => {
      grouped.set(pet.ownerId, [...(grouped.get(pet.ownerId) ?? []), pet]);
    });
    return grouped;
  };

  return {
    async getCandidates(viewerId, options) {
      const viewerUser = await users.getById(viewerId);
      if (!viewerUser) throw new Error('Your profile could not be loaded');

      const [distanceRows, passes, sent, matches, incoming, viewerPets] = await Promise.all([
        supabase.rpc('discovery_distances', { p_limit: 300 }),
        supabase.from('passes').select('target_id').eq('viewer_id', viewerId),
        supabase.from('likes').select('to_user_id').eq('from_user_id', viewerId),
        supabase.from('matches').select('user_a, user_b'),
        supabase
          .from('likes')
          .select('from_user_id, is_treat')
          .eq('to_user_id', viewerId)
          .is('removed_at', null),
        petsByOwner([viewerId]),
      ]);

      const distances = new Map<ID, number>(
        (must(distanceRows) as { user_id: string; distance_miles: number }[]).map((r) => [
          r.user_id,
          r.distance_miles,
        ]),
      );

      // Everyone the viewer has already dealt with. (Blocked people never get a distance.)
      const excluded = new Set<ID>();
      (must(passes) as { target_id: string }[]).forEach((r) => excluded.add(r.target_id));
      (must(sent) as { to_user_id: string }[]).forEach((r) => excluded.add(r.to_user_id));
      (must(matches) as { user_a: string; user_b: string }[]).forEach((m) => {
        excluded.add(m.user_a);
        excluded.add(m.user_b);
      });

      // People who already liked the viewer surface sooner (Treats most of all).
      const incomingLikes = new Map<ID, LikedYou>();
      (must(incoming) as { from_user_id: string; is_treat: boolean }[]).forEach((l) => {
        const prior = incomingLikes.get(l.from_user_id);
        incomingLikes.set(l.from_user_id, { isTreat: l.is_treat || (prior?.isTreat ?? false) });
      });

      const candidateIds = [...distances.keys()].filter((id) => !excluded.has(id));
      const [people, pets] = await Promise.all([
        users.getMany(candidateIds),
        petsByOwner(candidateIds),
      ]);

      const viewer: Profile = { user: viewerUser, pets: viewerPets.get(viewerId) ?? [] };
      const pool: Profile[] = people.map((user) => ({ user, pets: pets.get(user.id) ?? [] }));
      const feed = buildFeed(viewer, pool, {
        now: new Date(),
        excludedIds: excluded,
        incomingLikes,
        distances,
      });

      const candidates: Candidate[] = feed.map((r) => ({
        user: r.profile.user,
        pets: r.profile.pets,
        distanceMiles: r.distanceMiles,
        compatibility: r.compatibility,
        likedYou: r.likedYou,
      }));
      return candidates.slice(0, options?.limit ?? candidates.length);
    },

    async pass(viewerId, targetUserId) {
      must(
        await supabase
          .from('passes')
          .upsert(
            { viewer_id: viewerId, target_id: targetUserId },
            { onConflict: 'viewer_id,target_id', ignoreDuplicates: true },
          ),
      );
    },

    async unpass(viewerId, targetUserId) {
      must(
        await supabase
          .from('passes')
          .delete()
          .eq('viewer_id', viewerId)
          .eq('target_id', targetUserId),
      );
    },
  };
}
