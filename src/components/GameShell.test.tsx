import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { AccessibilityInfo, Text } from 'react-native';
import { feedback } from '../feedback';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getStars, loadStars } from '../stars';
import { GameShell } from './GameShell';

async function renderShell(overrides: Partial<Parameters<typeof GameShell>[0]> = {}) {
  const props = {
    game: 'hanoi' as const,
    title: 'Test Game',
    level: 3,
    moves: 5,
    message: 'Do the thing',
    onBack: jest.fn(),
    onUndo: jest.fn(),
    canUndo: true,
    onRestart: jest.fn(),
    won: false,
    optimal: 5,
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

describe('GameShell', () => {
  it('shows the title, stats, message and board', async () => {
    await renderShell();
    expect(screen.getByText('Test Game')).toBeOnTheScreen();
    expect(screen.getByText('Level 3')).toBeOnTheScreen();
    expect(screen.getByText('Moves 5')).toBeOnTheScreen();
    expect(screen.getByText('Do the thing')).toBeOnTheScreen();
    expect(screen.getByText('board')).toBeOnTheScreen();
  });

  it('keeps the message line in place when there is no message', async () => {
    await renderShell({ message: null });
    expect(screen.getByText(' ')).toBeOnTheScreen();
  });

  it('wires the header and control buttons', async () => {
    const props = await renderShell();
    await fireEvent.press(screen.getByText('‹ Back'));
    await fireEvent.press(screen.getByText('Undo'));
    await fireEvent.press(screen.getByText('Restart'));
    expect(props.onBack).toHaveBeenCalledTimes(1);
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
    afterEach(() => jest.useRealTimers());

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
      await fireEvent.press(screen.getByText('Next level'));
      await fireEvent.press(screen.getByText('Menu'));
      expect(props.onNext).toHaveBeenCalledTimes(1);
      expect(props.onBack).toHaveBeenCalledTimes(1);
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
      expect(getStars('hoops')).toEqual({});
    });

    it('keeps the best stars when a level is replayed worse', async () => {
      await renderShell({ won: true, moves: 5 });
      screen.unmount();
      await renderShell({ won: true, moves: 9 });
      expect(getStars('hanoi')).toEqual({ 3: 3 });
    });

    it('records nothing before the game is won', async () => {
      await renderShell();
      expect(getStars('hanoi')).toEqual({});
    });

    it('does not show the win card if it unmounts before the delay', async () => {
      const errors = jest.spyOn(console, 'error').mockImplementation(() => {});
      await renderShell({ won: true });
      screen.unmount();
      await act(() => jest.advanceTimersByTime(650));
      expect(errors).not.toHaveBeenCalled();
      errors.mockRestore();
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

    it('locks undo', async () => {
      const props = await renderShell({ won: true });
      await fireEvent.press(screen.getByText('Undo'));
      expect(props.onUndo).not.toHaveBeenCalled();
    });
  });
});
