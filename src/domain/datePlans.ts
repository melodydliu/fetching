/**
 * Pure rules for Play Date plans: who may answer one, how it reads, and the day/time choices.
 * No UI or service imports.
 */
import type { DatePlan, ID, PlayDateKind } from './types';

export const PLAY_DATE_KINDS: readonly PlayDateKind[] = [
  'dog_park',
  'pet_friendly_cafe',
  'hiking_trail',
  'beach',
  'custom',
];

export const MAX_CUSTOM_LABEL = 40;
export const MAX_DATE_NOTE = 140;
export const MAX_LOCATION = 100;

/** Start-of-slot hours offered when picking a time. */
export const TIME_SLOTS: readonly { hour: number; label: string }[] = [
  { hour: 9, label: '9:00 AM' },
  { hour: 11, label: '11:00 AM' },
  { hour: 13, label: '1:00 PM' },
  { hour: 15, label: '3:00 PM' },
  { hour: 17, label: '5:00 PM' },
  { hour: 19, label: '7:00 PM' },
];

export const DAYS_AHEAD = 14;

/**
 * Whose answer the plan is waiting on, or null when it's settled.
 * A fresh proposal waits on the other person; a suggested change waits on whoever didn't suggest it.
 */
export function awaitingResponseFrom(plan: DatePlan, participantIds: readonly ID[]): ID | null {
  if (plan.status === 'proposed') {
    return participantIds.find((id) => id !== plan.proposerId) ?? null;
  }
  if (plan.status === 'change_suggested') {
    return participantIds.find((id) => id !== plan.respondedById) ?? null;
  }
  return null;
}

export function canRespond(plan: DatePlan, viewerId: ID, participantIds: readonly ID[]): boolean {
  return awaitingResponseFrom(plan, participantIds) === viewerId;
}

/** Only the person who planned it can change or cancel it; editing needs a future time. */
export function canEdit(plan: DatePlan, viewerId: ID, now: Date = new Date()): boolean {
  return plan.proposerId === viewerId && !isPast(plan, now);
}

export function canDelete(plan: DatePlan, viewerId: ID): boolean {
  return plan.proposerId === viewerId;
}

export function isPast(plan: DatePlan, now: Date = new Date()): boolean {
  return new Date(plan.startsAt).getTime() < now.getTime();
}

/** Combine a calendar day with an hour of the day in local time. */
export function combineDayAndHour(day: Date, hour: number): Date {
  const d = new Date(day);
  d.setHours(hour, 0, 0, 0);
  return d;
}

/** Today (when a slot is still ahead) plus the next days, as local midnights. */
export function buildDayOptions(now: Date = new Date(), count: number = DAYS_AHEAD): Date[] {
  const lastHour = TIME_SLOTS[TIME_SLOTS.length - 1]!.hour;
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const days: Date[] = [];
  for (let i = 0; i < count; i += 1) {
    const day = new Date(today);
    day.setDate(today.getDate() + i);
    if (i === 0 && combineDayAndHour(day, lastHour).getTime() <= now.getTime()) continue;
    days.push(day);
  }
  return days;
}

/** Time slots that are still in the future on `day`. */
export function availableSlots(day: Date, now: Date = new Date()): typeof TIME_SLOTS {
  return TIME_SLOTS.filter((s) => combineDayAndHour(day, s.hour).getTime() > now.getTime());
}

export interface PlanDraft {
  kind: PlayDateKind | null;
  customLabel: string;
  startsAt: Date | null;
}

/** Null when the draft can be sent, otherwise what's missing. */
export function validatePlanDraft(draft: PlanDraft, now: Date = new Date()): string | null {
  if (!draft.kind) return 'Pick what kind of date it is.';
  if (draft.kind === 'custom' && !draft.customLabel.trim()) return 'Say what you have in mind.';
  if (!draft.startsAt) return 'Pick a day and time.';
  if (draft.startsAt.getTime() <= now.getTime()) return 'Pick a time in the future.';
  return null;
}

export const PLAN_STATUS_LABELS: Record<DatePlan['status'], string> = {
  proposed: 'Waiting for a reply',
  accepted: 'Accepted',
  declined: 'Declined',
  change_suggested: 'New time suggested',
};

export function formatPlanWhen(iso: string, now: Date = new Date()): string {
  const date = new Date(iso);
  const dayStart = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const diffDays = Math.round((dayStart(date) - dayStart(now)) / 86_400_000);
  const time = date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  if (diffDays === 0) return `Today at ${time}`;
  if (diffDays === 1) return `Tomorrow at ${time}`;
  const day = date.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
  return `${day} at ${time}`;
}
