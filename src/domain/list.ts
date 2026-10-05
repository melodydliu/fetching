/** Returns a copy of `items` with the element at `from` moved to `to`. Out-of-range indices are clamped. */
export function moveItem<T>(items: readonly T[], from: number, to: number): T[] {
  if (items.length === 0 || from < 0 || from >= items.length) return [...items];
  const target = Math.max(0, Math.min(items.length - 1, to));
  const next = [...items];
  const [moved] = next.splice(from, 1);
  next.splice(target, 0, moved!);
  return next;
}
