import { formatMemberSince, maskIdentifier } from '../account';

describe('maskIdentifier', () => {
  it('shows only the first letter of an email name and the whole domain', () => {
    expect(maskIdentifier({ method: 'email', identifier: 'melody@example.com' })).toBe(
      'm•••••@example.com',
    );
    expect(maskIdentifier({ method: 'email', identifier: 'a@b.co' })).toBe('a•••@b.co');
  });
  it('shows only the last 4 digits of a phone number', () => {
    expect(maskIdentifier({ method: 'phone', identifier: '4155550123' })).toBe('•••• 0123');
  });
});

describe('formatMemberSince', () => {
  it('names the month and year', () => {
    expect(formatMemberSince('2026-03-14T12:00:00Z', 'en-US')).toBe('March 2026');
  });
});
