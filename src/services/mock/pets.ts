import type { PetRepository } from '../types';
import { MockDb, simulate } from './db';

export function createMockPets(db: MockDb): PetRepository {
  return {
    listByOwner: (ownerId) =>
      simulate(() => [...db.pets.values()].filter((p) => p.ownerId === ownerId)),
    create: (input) =>
      simulate(() => {
        const pet = { ...input, id: db.nextId('pet') };
        db.pets.set(pet.id, pet);
        return pet;
      }),
    update: (id, patch) =>
      simulate(() => {
        const existing = db.pets.get(id);
        if (!existing) throw new Error(`Pet not found: ${id}`);
        const next = { ...existing, ...patch };
        db.pets.set(id, next);
        return next;
      }),
    remove: (id) =>
      simulate(() => {
        db.pets.delete(id);
      }),
  };
}
