import { fireEvent, render, screen } from '@testing-library/react-native';
import type { DatePlan } from '@/domain/types';
import { DatePlanCard } from '../chat/DatePlanCard';

const future = new Date(Date.now() + 3 * 86_400_000).toISOString();
const plan = (over: Partial<DatePlan> = {}): DatePlan => ({
  id: 'p1',
  matchId: 'm1',
  proposerId: 'me',
  kind: 'dog_park',
  location: '120 Meadow Ln',
  startsAt: future,
  status: 'proposed',
  createdAt: new Date().toISOString(),
  ...over,
});

const handlers = {
  onAccept: jest.fn(),
  onSuggest: jest.fn(),
  onDecline: jest.fn(),
  onEdit: jest.fn(),
  onDelete: jest.fn(),
};
const ids = ['me', 'them'] as const;

const show = (p: DatePlan, viewerId: string) =>
  render(
    <DatePlanCard
      plan={p}
      viewerId={viewerId}
      participantIds={ids}
      otherName="Noah"
      {...handlers}
    />,
  );

beforeEach(() => jest.clearAllMocks());

describe('DatePlanCard', () => {
  it('the proposer can edit and delete, and sees who it is waiting on', async () => {
    await show(plan(), 'me');
    expect(screen.getByText('Waiting for Noah to reply')).toBeTruthy();
    expect(screen.getByText('120 Meadow Ln')).toBeTruthy();
    await fireEvent.press(screen.getByLabelText('Edit'));
    await fireEvent.press(screen.getByLabelText('Delete'));
    expect(handlers.onEdit).toHaveBeenCalledTimes(1);
    expect(handlers.onDelete).toHaveBeenCalledTimes(1);
    expect(screen.queryByLabelText('Accept')).toBeNull();
  });

  it('the other person can accept, suggest a change or decline, but not edit or delete', async () => {
    await show(plan(), 'them');
    expect(screen.getByText('Noah wants to meet up')).toBeTruthy();
    await fireEvent.press(screen.getByLabelText('Accept'));
    await fireEvent.press(screen.getByLabelText('Suggest a change'));
    await fireEvent.press(screen.getByLabelText('Decline'));
    expect(handlers.onAccept).toHaveBeenCalled();
    expect(handlers.onSuggest).toHaveBeenCalled();
    expect(handlers.onDecline).toHaveBeenCalled();
    expect(screen.queryByLabelText('Edit')).toBeNull();
    expect(screen.queryByLabelText('Delete')).toBeNull();
  });

  it('a settled plan has no response buttons, and a past plan can only be deleted', async () => {
    await show(plan({ status: 'accepted', respondedById: 'them' }), 'me');
    expect(screen.getByText('Noah accepted')).toBeTruthy();
    expect(screen.queryByLabelText('Accept')).toBeNull();
    await show(plan({ startsAt: new Date(Date.now() - 86_400_000).toISOString() }), 'me');
    expect(screen.getAllByLabelText('Delete').length).toBeGreaterThan(0);
  });
});
