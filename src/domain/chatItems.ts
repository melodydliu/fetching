/** Pure: turns a message list into chat rows with a day separator before each new day. */
import type { Message } from './types';

export type ChatItem =
  { type: 'day'; key: string; label: string } | { type: 'message'; key: string; message: Message };

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

export function formatDayLabel(iso: string, now: Date = new Date()): string {
  const date = new Date(iso);
  const diff = Math.round((startOfDay(now).getTime() - startOfDay(date).getTime()) / 86_400_000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  return date.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    ...(date.getFullYear() === now.getFullYear() ? {} : { year: 'numeric' }),
  });
}

/** Oldest first, a separator ahead of the first message of each calendar day. */
export function buildChatItems(messages: readonly Message[], now: Date = new Date()): ChatItem[] {
  const items: ChatItem[] = [];
  let lastDay = '';
  for (const message of messages) {
    const day = startOfDay(new Date(message.createdAt)).toDateString();
    if (day !== lastDay) {
      items.push({ type: 'day', key: `day-${day}`, label: formatDayLabel(message.createdAt, now) });
      lastDay = day;
    }
    items.push({ type: 'message', key: message.id, message });
  }
  return items;
}
