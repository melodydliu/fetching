import { useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import type { ID, Pet, Photo, Profile, User } from '@/domain/types';
import { useServices } from '@/services';
import type { NewPet } from '@/services/types';
import { useToastStore } from '@/state/toastStore';
import { queryKeys, useViewerId } from './queries';

/**
 * Write helpers for the signed-in user's own profile.
 * Updates are applied to the query cache immediately and persisted in the background,
 * so one-question-per-screen flows never stall on (simulated) network latency.
 */
export function useProfileActions() {
  const { users, pets, media } = useServices();
  const queryClient = useQueryClient();
  const viewerId = useViewerId();
  const showToast = useToastStore((s) => s.show);
  const key = queryKeys.profile(viewerId ?? '');

  const rollback = (message = "Couldn't save that. Check your connection and try again.") => {
    showToast(message);
    void queryClient.invalidateQueries({ queryKey: key });
  };

  const patchProfile = (fn: (p: Profile) => Profile) =>
    queryClient.setQueryData<Profile>(key, (old) => (old ? fn(old) : old));

  const updateUser = (patch: Partial<Omit<User, 'id'>>): Promise<void> => {
    patchProfile((p) => ({ ...p, user: { ...p.user, ...patch } }));
    return users.update(viewerId!, patch).then(
      () => undefined,
      () => rollback(),
    );
  };

  const createPet = async (input: Omit<NewPet, 'ownerId'>): Promise<Pet> => {
    const pet = await pets.create({ ...input, ownerId: viewerId! });
    patchProfile((p) => ({ ...p, pets: [...p.pets, pet] }));
    return pet;
  };

  const updatePet = (id: ID, patch: Partial<Omit<Pet, 'id' | 'ownerId'>>): Promise<void> => {
    patchProfile((p) => ({
      ...p,
      pets: p.pets.map((pet) => (pet.id === id ? { ...pet, ...patch } : pet)),
    }));
    return pets.update(id, patch).then(
      () => undefined,
      () => rollback(),
    );
  };

  const removePet = async (id: ID): Promise<void> => {
    patchProfile((p) => ({ ...p, pets: p.pets.filter((pet) => pet.id !== id) }));
    await pets.remove(id).catch(() => rollback());
  };

  const uploadPhotos = (uris: string[]): Promise<Photo[]> =>
    Promise.all(uris.map((uri) => media.upload(uri)));

  return { updateUser, createPet, updatePet, removePet, uploadPhotos };
}

/** Opens the system photo library. Resolves to the chosen local URIs (empty if cancelled). */
export async function pickPhotoUris(limit: number): Promise<string[]> {
  if (limit <= 0) return [];
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsMultipleSelection: limit > 1,
    selectionLimit: limit,
    quality: 0.8,
  });
  return result.canceled ? [] : result.assets.map((a) => a.uri).slice(0, limit);
}
