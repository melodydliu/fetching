import { fireEvent, screen } from '@testing-library/react-native';
import { useState } from 'react';
import { PhotoGrid } from '@/components/PhotoGrid';
import type { Photo } from '@/domain/types';
import { useToastStore } from '@/state/toastStore';
import { renderWithApp } from '@/test/render';

const photos = (n: number): Photo[] =>
  Array.from({ length: n }, (_, i) => ({ id: `p${i + 1}`, url: `https://example.com/${i}.jpg` }));

function Harness({ start, minToKeep }: { start: Photo[]; minToKeep: number }) {
  const [list, setList] = useState(start);
  return (
    <PhotoGrid
      photos={list}
      max={6}
      minToKeep={minToKeep}
      onChange={setList}
      onAddPress={() => {}}
    />
  );
}

async function renderGrid(start: Photo[], minToKeep: number) {
  await renderWithApp(<Harness start={start} minToKeep={minToKeep} />);
  // The grid measures itself before it draws the tiles.
  await fireEvent(screen.getByTestId('photo-grid'), 'layout', {
    nativeEvent: { layout: { width: 330, height: 0, x: 0, y: 0 } },
  });
}

describe('PhotoGrid remove', () => {
  beforeEach(() => useToastStore.getState().hide());

  it('removes a photo when more than the minimum remain', async () => {
    await renderGrid(photos(4), 3);
    await fireEvent.press(screen.getByLabelText('Remove photo 2 of 4'));
    expect(screen.getAllByLabelText(/^Remove photo \d of 3$/)).toHaveLength(3);
    expect(useToastStore.getState().message).toBeNull();
  });

  it('still shows the remove button at the minimum, and explains instead of deleting', async () => {
    await renderGrid(photos(3), 3);
    await fireEvent.press(screen.getByLabelText('Remove photo 1 of 3'));
    expect(screen.getAllByLabelText(/^Remove photo \d of 3$/)).toHaveLength(3);
    expect(useToastStore.getState().message).toMatch(/Keep at least 3 photos/);
  });

  it('lets the last photo go when there is no minimum', async () => {
    await renderGrid(photos(1), 0);
    await fireEvent.press(screen.getByLabelText('Remove photo 1 of 1'));
    expect(screen.queryByLabelText(/^Remove photo/)).toBeNull();
  });
});
