import type { SupabaseClient } from '@supabase/supabase-js';
import { newId } from '@/utils/id';
import type { MediaService } from '../types';
import { PHOTO_BUCKET } from './db';

const TYPES: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  heic: 'image/heic',
};

/** Uploads to the `photos` bucket at <user id>/<photo id>.<ext>; the photo id is the file name. */
export function createSupabaseMedia(supabase: SupabaseClient): MediaService {
  const currentUserId = async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw new Error('Sign in to add photos.');
    return data.user.id;
  };

  return {
    async upload(localUri) {
      const userId = await currentUserId();
      const ext = (localUri.split('?')[0]!.split('.').pop() ?? 'jpg').toLowerCase();
      const contentType = TYPES[ext] ?? 'image/jpeg';
      const id = newId('ph');
      const path = `${userId}/${id}.${TYPES[ext] ? ext : 'jpg'}`;

      const bytes = await (await fetch(localUri)).arrayBuffer();
      const { error } = await supabase.storage
        .from(PHOTO_BUCKET)
        .upload(path, bytes, { contentType, upsert: false });
      if (error) throw new Error(`Couldn't upload that photo. ${error.message}`);

      const { data } = supabase.storage.from(PHOTO_BUCKET).getPublicUrl(path);
      return { id, url: data.publicUrl };
    },

    // Photos are normally removed when a profile or pet is saved (see syncPhotos). This is for
    // an upload that never made it onto a profile: find its file by id and delete it.
    async remove(photoId) {
      const userId = await currentUserId();
      const { data: files } = await supabase.storage
        .from(PHOTO_BUCKET)
        .list(userId, { limit: 1000 });
      const file = files?.find((f) => f.name.startsWith(photoId));
      if (file) await supabase.storage.from(PHOTO_BUCKET).remove([`${userId}/${file.name}`]);
    },
  };
}
