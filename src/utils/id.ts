/**
 * Client-side id for new local records (prompt answers etc.). A random UUID v4, so it is also
 * a valid primary key in the real database. The prefix is ignored (kept so callers read well).
 */
export const newId = (_prefix?: string): string =>
  'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.floor(Math.random() * 16);
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
