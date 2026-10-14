import { act, fireEvent, renderAsync, screen } from '@testing-library/react-native';
import { AccessibilityInfo } from 'react-native';
import { RodButtons } from './RodButtons';

const labels = ['Rod 1', 'Rod 2', 'Rod 3', 'Rod 4', 'Rod 5'];

function screenReader(on: boolean) {
  jest.spyOn(AccessibilityInfo, 'isScreenReaderEnabled').mockResolvedValue(on);
}

afterEach(() => jest.restoreAllMocks());

async function renderButtons(props: Partial<Parameters<typeof RodButtons>[0]> = {}) {
  await renderAsync(<RodButtons labels={labels} rowSizes={[3, 2]} selected={null} onPress={jest.fn()} {...props} />);
  await act(async () => {});
}

describe('RodButtons', () => {
  it('stays out of the way when no screen reader is running', async () => {
    screenReader(false);
    await renderButtons();
    expect(screen.queryAllByRole('button')).toHaveLength(0);
  });

  it('gives each rod a labeled button in board order', async () => {
    screenReader(true);
    await renderButtons();
    const buttons = screen.getAllByRole('button');
    expect(buttons.map((b) => b.props.accessibilityLabel)).toEqual(labels);
    expect(buttons[0].props.accessibilityHint).toBe('Picks up the top');
  });

  it('reports the selected rod and where a tap will move', async () => {
    screenReader(true);
    await renderButtons({ rowSizes: [5], selected: 1 });
    const selected = screen.getByRole('button', { name: 'Rod 2' });
    expect(selected).toBeSelected();
    expect(selected.props.accessibilityHint).toBe('Puts it back');
    expect(screen.getByRole('button', { name: 'Rod 4' }).props.accessibilityHint).toBe('Moves here');
  });

  it('maps buttons in uneven rows to the right rods', async () => {
    screenReader(true);
    const onPress = jest.fn();
    const twelve = Array.from({ length: 12 }, (_, i) => `Rod ${i + 1}`);
    await renderButtons({ labels: twelve, rowSizes: [4, 4, 4], onPress });
    await fireEvent.press(screen.getByRole('button', { name: 'Rod 9' }));
    expect(onPress).toHaveBeenCalledWith(8);
    expect(screen.getAllByRole('button').map((b) => b.props.accessibilityLabel)).toEqual(twelve);
  });

  it('presses the matching rod', async () => {
    screenReader(true);
    const onPress = jest.fn();
    await renderButtons({ onPress });
    await fireEvent.press(screen.getByRole('button', { name: 'Rod 4' }));
    expect(onPress).toHaveBeenCalledWith(3);
  });

  it('appears when a screen reader is turned on later', async () => {
    screenReader(false);
    const listen: (event: 'screenReaderChanged', handler: (on: boolean) => void) => unknown =
      AccessibilityInfo.addEventListener;
    jest.mocked(listen).mockClear();
    await renderButtons({ rowSizes: [5] });
    expect(screen.queryAllByRole('button')).toHaveLength(0);
    const [, notify] = jest.mocked(listen).mock.calls.find(([event]) => event === 'screenReaderChanged')!;
    await act(async () => notify(true));
    expect(screen.getAllByRole('button')).toHaveLength(5);
  });
});
