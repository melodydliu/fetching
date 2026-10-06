import type { PostgrestError, SupabaseClient } from '@supabase/supabase-js';
import type { Photo } from '@/domain/types';
import { storagePathFromUrl } from './mappers';

export const PHOTO_BUCKET = 'photos';

/** Throw a readable Error for a failed query, or return its data. */
export function must<T>(result: { data: T | null; error: PostgrestError | null }): T {
  if (result.error) throw new Error(result.error.message);
  return result.data as T;
}

/**
 * Make the `photos` table match `photos` for one owner (person photos when petId is null,
 * otherwise that pet's): drop rows that were removed (and their uploaded files), then upsert
 * the rest in order, so position = index.
 */
export async function syncPhotos(
  supabase: SupabaseClient,
  ownerId: string,
  petId: string | null,
  photos: Photo[],
): Promise<void> {
  const scope = supabase.from('photos').select('id, storage_path').eq('owner_id', ownerId);
  const existing = must(await (petId ? scope.eq('pet_id', petId) : scope.is('pet_id', null))) as {
    id: string;
    storage_path: string | null;
  }[];

  const keep = new Set(photos.map((p) => p.id));
  const removed = existing.filter((row) => !keep.has(row.id));
  if (removed.length) {
    must(
      await supabase
        .from('photos')
        .delete()
        .in(
          'id',
          removed.map((r) => r.id),
        ),
    );
    const paths = removed.map((r) => r.storage_path).filter((p): p is string => !!p);
    // Best effort: an orphaned file is harmless, a failed profile save is not.
    if (paths.length) await supabase.storage.from(PHOTO_BUCKET).remove(paths);
  }

  if (photos.length) {
    must(
      await supabase.from('photos').upsert(
        photos.map((p, position) => ({
          id: p.id,
          owner_id: ownerId,
          pet_id: petId,
          url: p.url,
          storage_path: storagePathFromUrl(p.url, PHOTO_BUCKET),
          caption: p.caption ?? null,
          position,
        })),
        { onConflict: 'id' },
      ),
    );
  }
}
