import type { SupabaseClient } from '@supabase/supabase-js';
import type { Pet } from '@/domain/types';
import type { PetRepository } from '../types';
import { must, PHOTO_BUCKET, syncPhotos } from './db';
import { PET_SELECT, petFromRow, type PetRow, petPatchToRow } from './mappers';

export function createSupabasePets(supabase: SupabaseClient): PetRepository {
  const getOne = async (id: string): Promise<Pet> => {
    const row = must(
      await supabase.from('pets').select(PET_SELECT).eq('id', id).maybeSingle(),
    ) as unknown as PetRow | null;
    if (!row) throw new Error(`Pet not found: ${id}`);
    return petFromRow(row);
  };

  return {
    async listByOwner(ownerId) {
      const rows = must(
        await supabase
          .from('pets')
          .select(PET_SELECT)
          .eq('owner_id', ownerId)
          .order('position', { ascending: true })
          .order('created_at', { ascending: true }),
      ) as unknown as PetRow[];
      return rows.map(petFromRow);
    },

    async create(input) {
      const { photos, ownerId, ...fields } = input;
      // Next slot after the owner's existing pets, so order is stable.
      const { count } = await supabase
        .from('pets')
        .select('id', { count: 'exact', head: true })
        .eq('owner_id', ownerId);
      const created = must(
        await supabase
          .from('pets')
          .insert({ ...petPatchToRow(fields), owner_id: ownerId, position: count ?? 0 })
          .select('id')
          .single(),
      ) as { id: string };
      if (photos.length) await syncPhotos(supabase, ownerId, created.id, photos);
      return getOne(created.id);
    },

    async update(id, patch) {
      const row = petPatchToRow(patch);
      if (Object.keys(row).length) must(await supabase.from('pets').update(row).eq('id', id));
      if (patch.photos) {
        const owner = must(
          await supabase.from('pets').select('owner_id').eq('id', id).maybeSingle(),
        ) as { owner_id: string } | null;
        if (!owner) throw new Error(`Pet not found: ${id}`);
        await syncPhotos(supabase, owner.owner_id, id, patch.photos);
      }
      return getOne(id);
    },

    async remove(id) {
      // Photo rows go with the pet (cascade); delete their uploaded files first.
      const photos = must(
        await supabase.from('photos').select('storage_path').eq('pet_id', id),
      ) as { storage_path: string | null }[];
      must(await supabase.from('pets').delete().eq('id', id));
      const paths = photos.map((p) => p.storage_path).filter((p): p is string => !!p);
      if (paths.length) await supabase.storage.from(PHOTO_BUCKET).remove(paths);
    },
  };
}
