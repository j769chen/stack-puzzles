import { act, fireEvent, render, screen, within } from '@testing-library/react-native';
import { AccessibilityInfo, Alert, type AlertButton, BackHandler, Text } from 'react-native';
import { feedback } from '../feedback';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getStars, loadStars } from '../stars';
import { GameShell } from './GameShell';

async function renderShell(overrides: Partial<Parameters<typeof GameShell>[0]> = {}) {
  const props = {
    title: 'Test Game',
    label: 'Level 3',
    moves: 5,
    message: 'Do the thing',
    onBack: jest.fn(),
    onLevels: jest.fn(),
    onUndo: jest.fn(),
    canUndo: true,
    onRestart: jest.fn(),
    won: false,
    scoring: { game: 'hanoi' as const, key: 3, optimal: 5 },
    nextLabel: 'Next level',
    onNext: jest.fn(),
    children: <Text>board</Text>,
    ...overrides,
  };
  await render(<GameShell {...props} />);
  return props;
}

beforeEach(async () => {
  await AsyncStorage.clear();
  await loadStars();
});

function alertButton(label: string) {
  const buttons: AlertButton[] = jest.mocked(Alert.alert).mock.calls.at(-1)![2]!;
  return buttons.find((button) => button.text === label)!;
}

function hardwareBack() {
  const [, handler] = jest.mocked(BackHandler.addEventListener).mock.calls.at(-1)!;
  return handler({ type: 'hardwareBackPress', timeStamp: 0 } as never);
}

describe('GameShell', () => {
  describe('restarting', () => {
    beforeEach(() => jest.spyOn(Alert, 'alert').mockImplementation(() => {}));
    afterEach(() => jest.restoreAllMocks());

    it('asks before throwing away moves, and stays when told to', async () => {
      const props = await renderShell({ moves: 5 });
      await fireEvent.press(screen.getByRole('button', { name: 'Restart' }));
      expect(Alert.alert).toHaveBeenCalledWith('Restart this puzzle?', 'Your moves so far will be lost.', expect.any(Array), {
        cancelable: true,
      });
      alertButton('Keep playing').onPress?.();
      expect(props.onRestart).not.toHaveBeenCalled();
      alertButton('Restart').onPress?.();
      expect(props.onRestart).toHaveBeenCalledTimes(1);
    });

    it('restarts straight away before any move', async () => {
      const props = await renderShell({ moves: 0 });
      await fireEvent.press(screen.getByRole('button', { name: 'Restart' }));
      expect(props.onRestart).toHaveBeenCalledTimes(1);
      expect(Alert.alert).not.toHaveBeenCalled();
    });

    it('plays a solved puzzle again from the win card without asking', async () => {
      jest.useFakeTimers();
      const props = await renderShell({ moves: 7, won: true });
      await act(() => jest.advanceTimersByTime(650));
      await fireEvent.press(screen.getByRole('button', { name: 'Play again' }));
      expect(props.onRestart).toHaveBeenCalledTimes(1);
      expect(Alert.alert).not.toHaveBeenCalled();
    });
  });

  it('reports whether the puzzle is new, being played or won', async () => {
    const onProgress = jest.fn();
    const props = await renderShell({ moves: 0, onProgress });
    await screen.rerender(<GameShell {...props} moves={1} />);
    await screen.rerender(<GameShell {...props} moves={2} />);
    await screen.rerender(<GameShell {...props} moves={3} won />);
    await screen.rerender(<GameShell {...props} moves={0} />);
    expect(onProgress.mock.calls).toEqual([['new'], ['playing'], ['won'], ['new']]);
  });

  describe('leaving', () => {
    beforeEach(() => {
      jest.spyOn(Alert, 'alert').mockImplementation(() => {});
      jest.spyOn(BackHandler, 'addEventListener').mockImplementation(() => ({ remove: jest.fn() }));
    });
    afterEach(() => jest.restoreAllMocks());

    it('goes straight back before any move', async () => {
      const props = await renderShell({ moves: 0 });
      await fireEvent.press(screen.getByRole('button', { name: 'Back' }));
      expect(props.onBack).toHaveBeenCalledTimes(1);
      expect(Alert.alert).not.toHaveBeenCalled();
    });

    it('asks before throwing away moves, and stays when told to', async () => {
      const props = await renderShell({ moves: 5 });
      await fireEvent.press(screen.getByRole('button', { name: 'Back' }));
      expect(Alert.alert).toHaveBeenCalledWith('Leave this puzzle?', 'Your moves so far will be lost.', expect.any(Array), {
        cancelable: true,
      });
      alertButton('Keep playing').onPress?.();
      expect(props.onBack).not.toHaveBeenCalled();
      alertButton('Leave').onPress?.();
      expect(props.onBack).toHaveBeenCalledTimes(1);
    });

    it('asks the same way on the Android back button', async () => {
      const props = await renderShell({ moves: 5 });
      expect(hardwareBack()).toBe(true);
      expect(props.onBack).not.toHaveBeenCalled();
      alertButton('Leave').onPress?.();
      expect(props.onBack).toHaveBeenCalledTimes(1);
    });

    it('goes straight back once the puzzle is solved', async () => {
      const props = await renderShell({ moves: 5, won: true });
      expect(hardwareBack()).toBe(true);
      expect(props.onBack).toHaveBeenCalledTimes(1);
      expect(Alert.alert).not.toHaveBeenCalled();
    });
  });

  it('shows the title, stats, message and board', async () => {
    await renderShell();
    expect(screen.getByText('Test Game')).toBeOnTheScreen();
    expect(screen.getByText('Level 3')).toBeOnTheScreen();
    expect(screen.getByText('Moves 5/5')).toBeOnTheScreen();
    expect(screen.getByText('Do the thing')).toBeOnTheScreen();
    expect(screen.getByText('board')).toBeOnTheScreen();
  });

  it('shows the stars the current move count would earn', async () => {
    await renderShell({ moves: 4, scoring: { game: 'hanoi', key: 3, optimal: 4 } });
    expect(screen.getByLabelText('3 of 3 stars')).toBeOnTheScreen();
    expect(screen.getByText('Moves 4/4')).not.toHaveStyle({ color: '#C62828' });
    await renderShell({ moves: 5, scoring: { game: 'hanoi', key: 3, optimal: 4 } });
    expect(screen.getByLabelText('2 of 3 stars')).toBeOnTheScreen();
    expect(screen.getByText('Moves 5/4')).toHaveStyle({ color: '#C62828' });
    await renderShell({ moves: 7, scoring: { game: 'hanoi', key: 3, optimal: 4 } });
    expect(screen.getByLabelText('1 of 3 stars')).toBeOnTheScreen();
  });

  it('reads out a changed message after whatever is being spoken', async () => {
    const announce = jest.mocked(AccessibilityInfo.announceForAccessibilityWithOptions);
    announce.mockClear();
    const props = await renderShell();
    await screen.rerender(<GameShell {...props} moves={6} />);
    expect(announce).not.toHaveBeenCalled();
    await screen.rerender(<GameShell {...props} message="Stuck" />);
    expect(announce).toHaveBeenCalledWith('Stuck', { queue: true });
    await screen.rerender(<GameShell {...props} message={null} />);
    expect(announce).toHaveBeenCalledTimes(1);
  });

  it('keeps the message line in place when there is no message', async () => {
    await renderShell({ message: null });
    expect(screen.getByText(' ')).toBeOnTheScreen();
  });

  it('wires the header and control buttons', async () => {
    const props = await renderShell({ moves: 0 });
    await fireEvent.press(screen.getByText('‹ Back'));
    await fireEvent.press(screen.getByRole('button', { name: 'Levels' }));
    await fireEvent.press(screen.getByText('Undo'));
    await fireEvent.press(screen.getByText('Restart'));
    expect(props.onBack).toHaveBeenCalledTimes(1);
    expect(props.onLevels).toHaveBeenCalledTimes(1);
    expect(props.onUndo).toHaveBeenCalledTimes(1);
    expect(props.onRestart).toHaveBeenCalledTimes(1);
  });

  it('labels the back button and reports disabled controls', async () => {
    await renderShell({ canUndo: false });
    expect(screen.getByRole('button', { name: 'Back' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Undo' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Restart' })).toBeEnabled();
    expect(screen.getByRole('header', { name: 'Test Game' })).toBeOnTheScreen();
  });

  it('disables undo when there is nothing to undo', async () => {
    const props = await renderShell({ canUndo: false });
    await fireEvent.press(screen.getByText('Undo'));
    expect(props.onUndo).not.toHaveBeenCalled();
  });

  describe('when won', () => {
    beforeEach(() => jest.useFakeTimers());

    it('shows the win card after the last move settles', async () => {
      const props = await renderShell({ won: true });
      expect(screen.queryByText('Solved!')).toBeNull();

      await act(() => jest.advanceTimersByTime(650));
      expect(screen.getByText('Solved!')).toBeOnTheScreen();
      expect(screen.getByText('Perfect! 5 moves, the minimum possible.')).toBeOnTheScreen();
      expect(screen.getByLabelText('3 of 3 stars')).toBeOnTheScreen();

      expect(AccessibilityInfo.announceForAccessibility).toHaveBeenCalledWith(
        'Solved! 3 of 3 stars. Perfect! 5 moves, the minimum possible.',
      );
      expect(screen.queryByText('Menu')).toBeNull();
      await fireEvent.press(screen.getByText('Next level'));
      expect(props.onNext).toHaveBeenCalledTimes(1);
    });

    it.each([
      [6, 2],
      [7, 2],
      [8, 1],
    ])('gives %i moves against a minimum of 5 %i stars and names the goal', async (moves, stars) => {
      await renderShell({ won: true, moves });
      await act(() => jest.advanceTimersByTime(650));
      expect(screen.getByLabelText(`${stars} of 3 stars`)).toBeOnTheScreen();
      expect(screen.getByText(`${moves} moves. Solve it in 5 for three stars.`)).toBeOnTheScreen();
    });

    it('records the stars for the level as soon as it is won', async () => {
      await renderShell({ won: true, moves: 7 });
      expect(getStars('hanoi')).toEqual({ 3: 2 });
      expect(getStars('daily')).toEqual({});
    });

    it('keeps the best stars when a level is replayed worse', async () => {
      await renderShell({ won: true, moves: 5 });
      screen.unmount();
      await renderShell({ won: true, moves: 9 });
      expect(getStars('hanoi')).toEqual({ 3: 3 });
    });

    it('shows a note and a Share button on the win card when given', async () => {
      const onShare = jest.fn();
      await renderShell({ won: true, moves: 6, winNote: '4-day streak', onShare });
      await act(() => jest.advanceTimersByTime(650));
      expect(screen.getByText('4-day streak')).toBeOnTheScreen();
      await fireEvent.press(screen.getByText('Share'));
      expect(onShare).toHaveBeenCalledWith(6);
    });

    it('leaves out the note and Share button by default', async () => {
      await renderShell({ won: true });
      await act(() => jest.advanceTimersByTime(650));
      expect(screen.queryByText('Share')).toBeNull();
    });

    it('shows a plain move count and no stars without scoring', async () => {
      await renderShell({ won: true, moves: 9, scoring: undefined, onLevels: undefined });
      expect(screen.getByText('Moves 9')).toBeOnTheScreen();
      expect(screen.queryByRole('button', { name: 'Levels' })).toBeNull();
      await act(() => jest.advanceTimersByTime(650));
      expect(screen.getByText('Sorted in 9 moves.')).toBeOnTheScreen();
      expect(screen.queryByLabelText(/of 3 stars/)).toBeNull();
      expect(getStars('hanoi')).toEqual({});
    });

    it('records nothing before the game is won', async () => {
      await renderShell();
      expect(getStars('hanoi')).toEqual({});
    });

    it('hides the board and controls from screen readers behind the win card, but not Back', async () => {
      await renderShell({ won: true });
      await act(() => jest.advanceTimersByTime(650));
      expect(screen.queryByRole('button', { name: 'Undo' })).toBeNull();
      const undo = screen.getByText('Undo', { includeHiddenElements: true });
      let hidden = false;
      for (let node: typeof undo | null = undo; node; node = node.parent) {
        if (node.props.importantForAccessibility === 'no-hide-descendants') hidden = true;
      }
      expect(hidden).toBe(true);
      expect(screen.getByRole('button', { name: 'Back' })).toBeOnTheScreen();
    });

    it('keeps the header out from under the win card so Back still works', async () => {
      const props = await renderShell({ won: true });
      await act(() => jest.advanceTimersByTime(650));
      const overlay = screen.getByText('Solved!').parent!.parent!;
      expect(within(overlay.parent!).queryByRole('button', { name: 'Back' })).toBeNull();
      await fireEvent.press(screen.getByRole('button', { name: 'Back' }));
      expect(props.onBack).toHaveBeenCalledTimes(1);
    });

    it('cancels the win card delay if it unmounts first', async () => {
      await renderShell({ won: true });
      expect(jest.getTimerCount()).toBe(1);
      screen.unmount();
      expect(jest.getTimerCount()).toBe(0);
    });

    it('waits the full delay again when a solved puzzle is restarted and solved again', async () => {
      const props = await renderShell({ won: true });
      await act(() => jest.advanceTimersByTime(650));
      expect(screen.getByText('Solved!')).toBeOnTheScreen();
      await screen.rerender(<GameShell {...props} won={false} moves={0} />);
      await screen.rerender(<GameShell {...props} won />);
      expect(screen.queryByText('Solved!')).toBeNull();
      await act(() => jest.advanceTimersByTime(650));
      expect(screen.getByText('Solved!')).toBeOnTheScreen();
    });

    it('drops the pending win card on a restart during the delay, and waits again for the next win', async () => {
      const onWinShown = jest.fn();
      const props = await renderShell({ won: true, onWinShown });
      await act(() => jest.advanceTimersByTime(400));
      await screen.rerender(<GameShell {...props} won={false} moves={0} />);
      await act(() => jest.advanceTimersByTime(650));
      expect(screen.queryByText('Solved!')).toBeNull();
      expect(onWinShown).not.toHaveBeenCalled();
      await screen.rerender(<GameShell {...props} won />);
      expect(screen.queryByText('Solved!')).toBeNull();
      await act(() => jest.advanceTimersByTime(650));
      expect(screen.getByText('Solved!')).toBeOnTheScreen();
    });

    it('reports when the win card is on screen', async () => {
      const onWinShown = jest.fn();
      await renderShell({ won: true, onWinShown });
      await act(() => jest.advanceTimersByTime(649));
      expect(onWinShown).not.toHaveBeenCalled();
      await act(() => jest.advanceTimersByTime(1));
      expect(screen.getByText('Solved!')).toBeOnTheScreen();
      expect(onWinShown).toHaveBeenCalledTimes(1);
    });

    it('plays the win feedback once, the moment the game is won', async () => {
      const win = jest.spyOn(feedback, 'win');
      const props = await renderShell();
      expect(win).not.toHaveBeenCalled();
      await screen.rerender(<GameShell {...props} won />);
      await screen.rerender(<GameShell {...props} won moves={6} />);
      expect(win).toHaveBeenCalledTimes(1);
      win.mockRestore();
    });

    it('reports the win once, the moment the game is won', async () => {
      const onWin = jest.fn();
      const props = await renderShell({ onWin });
      expect(onWin).not.toHaveBeenCalled();
      await screen.rerender(<GameShell {...props} won />);
      expect(onWin).toHaveBeenCalledTimes(1);
      await screen.rerender(<GameShell {...props} won moves={6} onWin={jest.fn()} />);
      await act(() => jest.advanceTimersByTime(650));
      expect(onWin).toHaveBeenCalledTimes(1);
    });

    it('locks undo', async () => {
      const props = await renderShell({ won: true });
      await fireEvent.press(screen.getByText('Undo'));
      expect(props.onUndo).not.toHaveBeenCalled();
    });
  });
});
