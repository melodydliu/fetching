import {
  availableSlots,
  awaitingResponseFrom,
  buildDayOptions,
  canDelete,
  canEdit,
  canRespond,
  combineDayAndHour,
  formatPlanWhen,
  isPast,
  validatePlanDraft,
} from '../datePlans';
import type { DatePlan } from '../types';

const ids = ['a', 'b'] as const;
const plan = (over: Partial<DatePlan> = {}): DatePlan => ({
  id: 'p1',
  matchId: 'm1',
  proposerId: 'a',
  kind: 'dog_park',
  startsAt: '2026-10-10T17:00:00.000Z',
  status: 'proposed',
  createdAt: '2026-10-05T10:00:00.000Z',
  ...over,
});

describe('awaitingResponseFrom', () => {
  it('a new proposal waits on the other person', () => {
    expect(awaitingResponseFrom(plan(), ids)).toBe('b');
  });
  it('a suggested change waits on whoever did not suggest it', () => {
    expect(
      awaitingResponseFrom(plan({ status: 'change_suggested', respondedById: 'b' }), ids),
    ).toBe('a');
  });
  it('settled plans wait on nobody', () => {
    expect(awaitingResponseFrom(plan({ status: 'accepted', respondedById: 'b' }), ids)).toBeNull();
    expect(awaitingResponseFrom(plan({ status: 'declined', respondedById: 'b' }), ids)).toBeNull();
  });
  it('canRespond is only true for that person', () => {
    expect(canRespond(plan(), 'a', ids)).toBe(false);
    expect(canRespond(plan(), 'b', ids)).toBe(true);
  });
});

describe('day and time options', () => {
  const morning = new Date(2026, 9, 5, 8, 0);
  const lateNight = new Date(2026, 9, 5, 21, 0);

  it('offers today while a slot is left, else starts tomorrow', () => {
    expect(buildDayOptions(morning, 3)[0]!.getDate()).toBe(5);
    expect(buildDayOptions(lateNight, 3)[0]!.getDate()).toBe(6);
    expect(buildDayOptions(morning, 14)).toHaveLength(14);
  });
  it('hides slots that already passed', () => {
    const noon = new Date(2026, 9, 5, 12, 0);
    const today = new Date(2026, 9, 5);
    expect(availableSlots(today, noon).map((s) => s.hour)).toEqual([13, 15, 17, 19]);
    expect(availableSlots(new Date(2026, 9, 6), noon)).toHaveLength(6);
  });
  it('combines a day with an hour in local time', () => {
    const d = combineDayAndHour(new Date(2026, 9, 6, 3, 30), 15);
    expect([d.getDate(), d.getHours(), d.getMinutes()]).toEqual([6, 15, 0]);
  });
});

describe('validatePlanDraft', () => {
  const now = new Date(2026, 9, 5, 12, 0);
  const future = new Date(2026, 9, 6, 11, 0);
  it('needs a kind, a time in the future, and a label for custom dates', () => {
    expect(validatePlanDraft({ kind: null, customLabel: '', startsAt: future }, now)).toMatch(
      /kind/,
    );
    expect(validatePlanDraft({ kind: 'beach', customLabel: '', startsAt: null }, now)).toMatch(
      /day and time/,
    );
    expect(validatePlanDraft({ kind: 'beach', customLabel: '', startsAt: now }, now)).toMatch(
      /future/,
    );
    expect(validatePlanDraft({ kind: 'custom', customLabel: '  ', startsAt: future }, now)).toMatch(
      /in mind/,
    );
  });
  it('accepts a complete draft', () => {
    expect(validatePlanDraft({ kind: 'beach', customLabel: '', startsAt: future }, now)).toBeNull();
    expect(
      validatePlanDraft({ kind: 'custom', customLabel: 'Puppy yoga', startsAt: future }, now),
    ).toBeNull();
  });
});

describe('formatting', () => {
  it('says today and tomorrow, and knows when a plan has passed', () => {
    const now = new Date(2026, 9, 5, 12, 0);
    expect(formatPlanWhen(new Date(2026, 9, 5, 15, 0).toISOString(), now)).toMatch(/^Today at/);
    expect(formatPlanWhen(new Date(2026, 9, 6, 15, 0).toISOString(), now)).toMatch(/^Tomorrow at/);
    expect(isPast(plan({ startsAt: new Date(2026, 9, 4).toISOString() }), now)).toBe(true);
    expect(isPast(plan({ startsAt: new Date(2026, 9, 9).toISOString() }), now)).toBe(false);
  });
});

describe('editing and deleting', () => {
  const now = new Date(2026, 9, 5, 12, 0);
  const upcoming = plan({ startsAt: new Date(2026, 9, 9).toISOString() });
  const past = plan({ startsAt: new Date(2026, 9, 4).toISOString() });

  it('only the proposer can edit, and only before it happens', () => {
    expect(canEdit(upcoming, 'a', now)).toBe(true);
    expect(canEdit(upcoming, 'b', now)).toBe(false);
    expect(canEdit(past, 'a', now)).toBe(false);
  });
  it('only the proposer can delete, even after it happened', () => {
    expect(canDelete(upcoming, 'a')).toBe(true);
    expect(canDelete(past, 'a')).toBe(true);
    expect(canDelete(upcoming, 'b')).toBe(false);
  });
});
