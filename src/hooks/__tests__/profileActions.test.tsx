import { act, renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { SEED_VIEWER_ID } from '@/mocks/seed';
import { ServicesProvider } from '@/services';
import { createMockServices, MockDb } from '@/services/mock';
import { useProfileActions } from '../profileActions';
import { queryKeys } from '../queries';

const setup = async () => {
  const db = new MockDb();
  const services = createMockServices(db);
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  // The app has the session and profile loaded before any edit happens.
  await queryClient.prefetchQuery({
    queryKey: queryKeys.session,
    queryFn: () => services.auth.getSession(),
  });
  const user = (await services.users.getById(SEED_VIEWER_ID))!;
  queryClient.setQueryData(queryKeys.profile(SEED_VIEWER_ID), {
    user,
    pets: await services.pets.listByOwner(SEED_VIEWER_ID),
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <ServicesProvider services={services}>{children}</ServicesProvider>
    </QueryClientProvider>
  );
  const { result } = await renderHook(() => useProfileActions(), { wrapper });
  return { db, services, result };
};

describe('pets decide the profile type', () => {
  it('removing the last pet makes an animal lover; adding one makes a pet owner again', async () => {
    const { db, services, result } = await setup();
    const pets = await services.pets.listByOwner(SEED_VIEWER_ID);
    expect(db.users.get(SEED_VIEWER_ID)!.kind).toBe('pet_owner');

    for (const pet of pets) await act(() => result.current.removePet(pet.id));
    await waitFor(() => expect(db.users.get(SEED_VIEWER_ID)!.kind).toBe('animal_lover'));
    expect(db.users.get(SEED_VIEWER_ID)!.animalLover).toBeDefined();

    const { id: _id, ...fields } = pets[0]!;
    await act(() => result.current.createPet(fields));
    await waitFor(() => expect(db.users.get(SEED_VIEWER_ID)!.kind).toBe('pet_owner'));
  });
});
