/** Client-side id for new local records (prompt answers etc.). Real backends assign their own. */
export const newId = (prefix: string): string =>
  `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
