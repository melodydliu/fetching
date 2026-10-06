import { moveItem, removeItemKeepingMin } from '../list';

const items = (n: number) => Array.from({ length: n }, (_, i) => ({ id: `p${i + 1}` }));

describe('removeItemKeepingMin', () => {
  it('removes the item when enough remain', () => {
    expect(removeItemKeepingMin(items(4), 'p2', 3)).toEqual({
      items: [{ id: 'p1' }, { id: 'p3' }, { id: 'p4' }],
      blocked: false,
    });
  });
  it('refuses, and says so, at the minimum', () => {
    expect(removeItemKeepingMin(items(3), 'p2', 3)).toEqual({ items: items(3), blocked: true });
  });
  it('has no minimum by default use (0): the last one can go', () => {
    expect(removeItemKeepingMin(items(1), 'p1', 0)).toEqual({ items: [], blocked: false });
  });
  it('ignores an unknown id', () => {
    expect(removeItemKeepingMin(items(3), 'nope', 3)).toEqual({ items: items(3), blocked: false });
  });
});

describe('moveItem', () => {
  it('moves an element and clamps the target', () => {
    expect(moveItem(['a', 'b', 'c'], 0, 9)).toEqual(['b', 'c', 'a']);
  });
});
