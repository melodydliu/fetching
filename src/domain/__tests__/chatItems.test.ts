import { buildChatItems, formatDayLabel } from '../chatItems';
import type { Message } from '../types';

const msg = (id: string, when: Date): Message => ({
  id,
  matchId: 'm',
  senderId: 'a',
  kind: 'text',
  text: id,
  createdAt: when.toISOString(),
});

const now = new Date(2026, 9, 5, 15, 0);

describe('buildChatItems', () => {
  it('puts one separator before each new day, oldest first', () => {
    const items = buildChatItems(
      [
        msg('a', new Date(2026, 9, 3, 9, 0)),
        msg('b', new Date(2026, 9, 3, 21, 0)),
        msg('c', new Date(2026, 9, 5, 8, 0)),
      ],
      now,
    );
    expect(items.map((i) => (i.type === 'day' ? `# ${i.label.split(',')[0]}` : i.key))).toEqual([
      expect.stringMatching(/^# /),
      'a',
      'b',
      '# Today',
      'c',
    ]);
  });

  it('is empty for no messages', () => {
    expect(buildChatItems([], now)).toEqual([]);
  });
});

describe('formatDayLabel', () => {
  it('says Today and Yesterday, otherwise the date', () => {
    expect(formatDayLabel(new Date(2026, 9, 5, 1).toISOString(), now)).toBe('Today');
    expect(formatDayLabel(new Date(2026, 9, 4, 23).toISOString(), now)).toBe('Yesterday');
    expect(formatDayLabel(new Date(2026, 8, 20).toISOString(), now)).toMatch(/Sep/);
  });
});
