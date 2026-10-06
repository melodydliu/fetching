/** Returns a copy of `items` with the element at `from` moved to `to`. Out-of-range indices are clamped. */
export function moveItem<T>(items: readonly T[], from: number, to: number): T[] {
  if (items.length === 0 || from < 0 || from >= items.length) return [...items];
  const target = Math.max(0, Math.min(items.length - 1, to));
  const next = [...items];
  const [moved] = next.splice(from, 1);
  next.splice(target, 0, moved!);
  return next;
}

/**
 * Removes the item with `id`, unless that would leave fewer than `minToKeep`.
 * `blocked` tells the caller why nothing changed so it can explain.
 */
export function removeItemKeepingMin<T extends { id: string }>(
  items: readonly T[],
  id: string,
  minToKeep: number,
): { items: T[]; blocked: boolean } {
  if (!items.some((item) => item.id === id)) return { items: [...items], blocked: false };
  if (items.length <= minToKeep) return { items: [...items], blocked: true };
  return { items: items.filter((item) => item.id !== id), blocked: false };
}
