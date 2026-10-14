import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, fireEvent, renderAsync, screen } from '@testing-library/react-native';
import { AccessibilityInfo } from 'react-native';
import { feedback } from '../../feedback';
import { HanoiScreen } from './HanoiScreen';
import * as logic from './logic';

const { HANOI_MAX_LEVEL, minMoves } = logic;

let mockScreenReader = false;
jest.mock('../../useScreenReader', () => ({ useScreenReader: () => mockScreenReader }));

jest.mock('./HanoiBoard', () => {
  const { Pressable, Text } = jest.requireActual<typeof import('react-native')>('react-native');
  return {
    HanoiBoard: ({ state, selected, onPress }: { state: number[][]; selected: number | null; onPress: (peg: number) => void }) =>
      state.map((peg, i) => (
        <Pressable key={i} testID={`peg-${i}`} onPress={() => onPress(i)}>
          <Text testID={`peg-${i}-disks`}>{`${selected === i ? '*' : ''}${peg.join(',')}`}</Text>
        </Pressable>
      )),
  };
});

const peg = (i: number) => screen.getByTestId(`peg-${i}`);
const pegText = (i: number) => screen.getByTestId(`peg-${i}-disks`).props.children as string;

async function move(from: number, to: number) {
  await fireEvent.press(peg(from));
  await fireEvent.press(peg(to));
}

async function start(level?: number) {
  if (level) await AsyncStorage.setItem('hanoi.level', String(level));
  await renderAsync(<HanoiScreen onBack={jest.fn()} />);
  await screen.findByText(`Level ${level ?? 1}`);
}

async function solveWithHints() {
  while (!screen.queryByText('Solved!')) {
    await fireEvent.press(screen.getByText('Hint'));
    const hint = screen.getByText(/Move the top disk/).props.children as string;
    const names = ['left', 'middle', 'right'];
    const [, from, to] = hint.match(/from the (\w+) peg to the (\w+) peg/)!;
    await move(names.indexOf(from), names.indexOf(to));
    await act(() => jest.advanceTimersByTime(650));
  }
}

beforeEach(() => AsyncStorage.clear());
afterEach(() => jest.restoreAllMocks());

describe('HanoiScreen', () => {
  it('starts level 1 with three disks on the left peg', async () => {
    await start();
    expect(pegText(0)).toBe('3,2,1');
    expect(screen.getByText('Move all 3 disks to another peg · best 7')).toBeOnTheScreen();
  });

  it('selects, moves and counts', async () => {
    await start();
    await fireEvent.press(peg(0));
    expect(pegText(0)).toBe('*3,2,1');
    await fireEvent.press(peg(2));
    expect(pegText(2)).toBe('1');
    expect(screen.getByText('Moves 1')).toBeOnTheScreen();
  });

  it('deselects on a second tap and ignores empty pegs', async () => {
    await start();
    await fireEvent.press(peg(1));
    expect(pegText(1)).toBe('');
    await fireEvent.press(peg(0));
    await fireEvent.press(peg(0));
    expect(pegText(0)).toBe('3,2,1');
  });

  it('switches selection on an illegal move', async () => {
    await start();
    await move(0, 2);
    await move(0, 2);
    expect(pegText(2)).toBe('*1');
    expect(screen.getByText('Moves 1')).toBeOnTheScreen();
  });

  it('undoes and restarts', async () => {
    await start();
    await move(0, 2);
    await move(0, 1);
    await fireEvent.press(screen.getByText('Undo'));
    expect(pegText(1)).toBe('');
    expect(screen.getByText('Moves 1')).toBeOnTheScreen();
    await fireEvent.press(screen.getByText('Restart'));
    expect(pegText(0)).toBe('3,2,1');
    expect(screen.getByText('Moves 0')).toBeOnTheScreen();
  });

  it('gives feedback when picking up and dropping a disk', async () => {
    const pick = jest.spyOn(feedback, 'pick');
    const drop = jest.spyOn(feedback, 'drop');
    await start();
    await fireEvent.press(peg(1));
    expect(pick).not.toHaveBeenCalled();
    await move(0, 2);
    expect(pick).toHaveBeenCalledTimes(1);
    expect(drop).toHaveBeenCalledTimes(1);
  });

  it('clears the hint once a move is made', async () => {
    await start();
    await fireEvent.press(screen.getByText('Hint'));
    await move(0, 1);
    expect(screen.getByText('Move all 3 disks to another peg · best 7')).toBeOnTheScreen();
  });

  it('names the hinted pegs by position', async () => {
    await start();
    await fireEvent.press(screen.getByText('Hint'));
    expect(screen.getByText('Move the top disk from the left peg to the right peg')).toBeOnTheScreen();
  });

  describe('with a screen reader', () => {
    beforeEach(() => (mockScreenReader = true));
    afterEach(() => (mockScreenReader = false));

    it('describes each peg and plays through the peg buttons', async () => {
      await start();
      const left = await screen.findByRole('button', { name: 'left peg, disks 3, 2, 1 from the bottom' });
      expect(screen.getByRole('button', { name: 'right peg, empty' })).toBeOnTheScreen();

      await fireEvent.press(left);
      expect(screen.getByRole('button', { name: /^left peg/ })).toBeSelected();
      await fireEvent.press(screen.getByRole('button', { name: 'right peg, empty' }));
      expect(screen.getByRole('button', { name: 'right peg, disks 1 from the bottom' })).toBeOnTheScreen();
      expect(AccessibilityInfo.announceForAccessibility).toHaveBeenCalledWith('Moved disk 1 to the right peg');
    });

    it('announces the hint and marks the pegs', async () => {
      await start();
      await fireEvent.press(screen.getByText('Hint'));
      expect(AccessibilityInfo.announceForAccessibility).toHaveBeenCalledWith(
        'Hint: move the top disk from the left peg to the right peg',
      );
      expect(await screen.findByRole('button', { name: /^left peg.*hint: move from here$/ })).toBeOnTheScreen();
      expect(screen.getByRole('button', { name: 'right peg, empty, hint: move here' })).toBeOnTheScreen();
    });
  });

  describe('winning', () => {
    beforeEach(() => jest.useFakeTimers());
    afterEach(() => jest.useRealTimers());

    it('praises a perfect solve and saves the next level', async () => {
      await start();
      await solveWithHints();
      expect(screen.getByText(`Perfect! ${minMoves(3)} moves, the minimum possible.`)).toBeOnTheScreen();
      await fireEvent.press(screen.getByText('Next level'));
      expect(await screen.findByText('Level 2')).toBeOnTheScreen();
      expect(await AsyncStorage.getItem('hanoi.level')).toBe('2');
    });

    it('ignores taps between the winning move and the win card', async () => {
      jest.spyOn(logic, 'disksForLevel').mockReturnValue(1);
      await start();
      await move(0, 2);
      await fireEvent.press(peg(2));
      expect(pegText(2)).toBe('1');
      expect(screen.getByText('Moves 1')).toBeOnTheScreen();
    });

    it('reports extra moves', async () => {
      await start();
      await move(0, 1);
      await move(1, 2);
      await solveWithHints();
      expect(screen.getByText(`${minMoves(3) + 1} moves. The minimum is ${minMoves(3)}.`)).toBeOnTheScreen();
    });

    it('wraps to level 1 after the last level', async () => {
      jest.spyOn(logic, 'disksForLevel').mockReturnValue(1);
      await AsyncStorage.setItem('hanoi.level', String(HANOI_MAX_LEVEL));
      await renderAsync(<HanoiScreen onBack={jest.fn()} />);
      await act(() => jest.runAllTimersAsync());
      const drop = jest.spyOn(feedback, 'drop');
      const win = jest.spyOn(feedback, 'win');
      await move(0, 2);
      expect(drop).not.toHaveBeenCalled();
      expect(win).toHaveBeenCalledTimes(1);
      await act(() => jest.advanceTimersByTime(650));
      await fireEvent.press(screen.getByText('Play again from level 1'));
      await act(() => jest.runAllTimersAsync());
      expect(screen.getByText('Level 1')).toBeOnTheScreen();
    });
  });
});
