/** Pure display helpers for the Account screen. */
import type { AccountInfo } from '@/services/types';

/** "m•••••@example.com" or "(•••) •••-1234": enough to recognise, not enough to leak. */
export function maskIdentifier(info: Pick<AccountInfo, 'method' | 'identifier'>): string {
  if (info.method === 'phone') {
    const digits = info.identifier.replace(/\D/g, '');
    return `•••• ${digits.slice(-4)}`;
  }
  const [name = '', domain = ''] = info.identifier.split('@');
  return `${name.charAt(0)}${'•'.repeat(Math.max(name.length - 1, 3))}@${domain}`;
}

export function formatMemberSince(iso: string, locale?: string): string {
  return new Date(iso).toLocaleDateString(locale, { month: 'long', year: 'numeric' });
}
