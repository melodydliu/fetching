import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { queryKeys } from '@/hooks/queries';
import { SEED_VIEWER_ID } from '@/mocks/seed';
import { MockDb } from '@/services/mock';
import { renderWithApp } from '@/test/render';
import { SafetySheet } from '../safety/SafetySheet';

// Confirmation dialogs are native; answer "yes" straight away.
jest.mock('@/utils/confirm', () => ({
  confirmAction: ({ onConfirm }: { onConfirm: () => void }) => onConfirm(),
}));

const setup = async (withMatch: boolean) => {
  const db = new MockDb();
  const match = db.matches.find((m) => m.userIds.includes(SEED_VIEWER_ID))!;
  const otherId = match.userIds.find((id) => id !== SEED_VIEWER_ID)!;
  const onDone = jest.fn();
  const onClose = jest.fn();
  const { queryClient, services } = await renderWithApp(
    <SafetySheet
      visible
      userId={otherId}
      name="Quinn"
      matchId={withMatch ? match.id : undefined}
      onClose={onClose}
      onDone={onDone}
    />,
    db,
  );
  // In the app the root layout has loaded the session by now.
  await queryClient.prefetchQuery({
    queryKey: queryKeys.session,
    queryFn: () => services.auth.getSession(),
  });
  return { db, match, otherId, onDone, onClose };
};

describe('SafetySheet', () => {
  it('offers Unmatch only when matched, and unmatching removes the match and its chat', async () => {
    const { db, match, onDone } = await setup(true);
    await fireEvent.press(screen.getByLabelText('Unmatch'));
    await waitFor(() => expect(onDone).toHaveBeenCalledWith('unmatched'));
    expect(db.matches.some((m) => m.id === match.id)).toBe(false);
    expect(db.messages.some((m) => m.matchId === match.id)).toBe(false);
  });

  it('has no Unmatch for someone you are not matched with', async () => {
    await setup(false);
    expect(screen.queryByLabelText('Unmatch')).toBeNull();
    expect(screen.getByLabelText('Block Quinn')).toBeTruthy();
  });

  it('blocking records the block and removes the match', async () => {
    const { db, otherId, match, onDone } = await setup(true);
    await fireEvent.press(screen.getByLabelText('Block Quinn'));
    await waitFor(() => expect(onDone).toHaveBeenCalledWith('blocked'));
    expect(db.blocks).toContainEqual({ blockerId: SEED_VIEWER_ID, blockedId: otherId });
    expect(db.matches.some((m) => m.id === match.id)).toBe(false);
  });

  it('a report needs a reason, is stored, and can also block', async () => {
    const { db, otherId, onDone } = await setup(true);
    await fireEvent.press(screen.getByLabelText('Report Quinn'));
    expect(screen.getByLabelText('Submit report').props.accessibilityState.disabled).toBe(true);

    await fireEvent.press(screen.getByLabelText('Harassment'));
    await fireEvent.press(screen.getByLabelText('Submit report'));
    await waitFor(() => expect(onDone).toHaveBeenCalledWith('reported'));
    expect(db.reports).toHaveLength(1);
    expect(db.reports[0]).toMatchObject({
      reporterId: SEED_VIEWER_ID,
      reportedId: otherId,
      reason: 'harassment',
    });
    expect(db.blocks.some((b) => b.blockedId === otherId)).toBe(false);
  });
});
