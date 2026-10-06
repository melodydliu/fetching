import { fireEvent, screen } from '@testing-library/react-native';
import { useState } from 'react';
import { dragRange, RangeSlider, stepRange, type Range } from '@/components/ui/RangeSlider';
import { renderWithApp } from '@/test/render';

describe('dragRange', () => {
  // 100 points of track across ages 18-98 (80 steps).
  const drag = (start: Range, end: 'min' | 'max', dx: number) =>
    dragRange(start, end, dx, 100, 18, 98);

  it('moves a handle in whole numbers in proportion to the drag', () => {
    expect(drag({ min: 25, max: 60 }, 'min', 25)).toEqual({ min: 45, max: 60 });
  });
  it('never passes the other handle or leaves the allowed range', () => {
    expect(drag({ min: 25, max: 35 }, 'min', 100)).toEqual({ min: 35, max: 35 });
    expect(drag({ min: 25, max: 35 }, 'max', -100)).toEqual({ min: 25, max: 25 });
    expect(drag({ min: 25, max: 35 }, 'min', -100)).toEqual({ min: 18, max: 35 });
    expect(drag({ min: 25, max: 35 }, 'max', 100)).toEqual({ min: 25, max: 98 });
  });
  it('does nothing before the track has been measured', () => {
    expect(dragRange({ min: 25, max: 35 }, 'min', 40, 0, 18, 98)).toEqual({ min: 25, max: 35 });
  });
});

describe('stepRange', () => {
  it('moves one handle a step, never crossing the other or leaving the range', () => {
    expect(stepRange({ min: 25, max: 35 }, 'min', 1, 18, 98)).toEqual({ min: 26, max: 35 });
    expect(stepRange({ min: 35, max: 35 }, 'min', 1, 18, 98)).toEqual({ min: 35, max: 35 });
    expect(stepRange({ min: 18, max: 30 }, 'min', -1, 18, 98)).toEqual({ min: 18, max: 30 });
    expect(stepRange({ min: 25, max: 25 }, 'max', -1, 18, 98)).toEqual({ min: 25, max: 25 });
    expect(stepRange({ min: 25, max: 98 }, 'max', 1, 18, 98)).toEqual({ min: 25, max: 98 });
  });
});

function Harness({ start }: { start: Range }) {
  const [range, setRange] = useState(start);
  return (
    <RangeSlider
      minLabel="Youngest age"
      maxLabel="Oldest age"
      lo={18}
      hi={98}
      value={range}
      onChange={setRange}
    />
  );
}

describe('RangeSlider', () => {
  it('exposes both handles to screen readers as adjustable values', async () => {
    await renderWithApp(<Harness start={{ min: 25, max: 35 }} />);
    const youngest = screen.getByLabelText('Youngest age');
    const oldest = screen.getByLabelText('Oldest age');
    expect(youngest.props.accessibilityValue).toMatchObject({ now: 25, text: '25' });
    expect(oldest.props.accessibilityValue).toMatchObject({ now: 35, text: '35' });
  });

  it('screen-reader increment and decrement move the handles', async () => {
    await renderWithApp(<Harness start={{ min: 25, max: 35 }} />);
    await fireEvent(screen.getByLabelText('Oldest age'), 'accessibilityAction', {
      nativeEvent: { actionName: 'increment' },
    });
    await fireEvent(screen.getByLabelText('Youngest age'), 'accessibilityAction', {
      nativeEvent: { actionName: 'decrement' },
    });
    expect(screen.getByLabelText('Oldest age').props.accessibilityValue.now).toBe(36);
    expect(screen.getByLabelText('Youngest age').props.accessibilityValue.now).toBe(24);
  });

  it('reports when a finger is on the slider so the screen can pause swipe-back', async () => {
    const onTouchingChange = jest.fn();
    await renderWithApp(
      <RangeSlider
        minLabel="Youngest age"
        maxLabel="Oldest age"
        lo={18}
        hi={98}
        value={{ min: 25, max: 35 }}
        onChange={() => {}}
        onTouchingChange={onTouchingChange}
      />,
    );
    const handle = screen.getByLabelText('Youngest age');
    await fireEvent(handle, 'touchStart');
    expect(onTouchingChange).toHaveBeenLastCalledWith(true);
    await fireEvent(handle, 'touchEnd');
    expect(onTouchingChange).toHaveBeenLastCalledWith(false);
  });
});
