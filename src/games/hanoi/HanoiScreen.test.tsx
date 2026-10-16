import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, fireEvent, renderAsync, screen } from '@testing-library/react-native';
import { AccessibilityInfo } from 'react-native';
import { feedback } from '../../feedback';
import { getStars, loadStars } from '../../stars';
import { HanoiScreen } from './HanoiScreen';
import * as logic from './logic';

const { HANOI_MAX_LEVEL, minMoves } = logic;

let mockScreenReader = false;
jest.mock('../../useScreenReader', () => ({ useScreenReader: () => mockScreenReader }));

type MockBoardProps = {
  state: number[][];
  selected: number | null;
  onPress: (peg: number) => void;
  onDrop: (peg: number) => void;
};

jest.mock('./HanoiBoard', () => {
  const { Pressable, Text } = jest.requireActual<typeof import('react-native')>('react-native');
  return {
    HanoiBoard: ({ state, selected, onPress, onDrop }: MockBoardProps) =>
      state.map((peg, i) => (
        <Pressable key={i} testID={`peg-${i}`} onPress={() => onPress(i)} onLongPress={() => onDrop(i)}>
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

describe('dragging', () => {
  it('moves the disk when it is dropped on a legal peg', async () => {
    await start();
    await fireEvent.press(peg(0));
    await fireEvent(peg(2), 'longPress');
    expect(pegText(2)).toBe('1');
    expect(screen.getByText('Moves 1/7')).toBeOnTheScreen();
  });

  it('puts the disk back when it is dropped on a peg it cannot go on', async () => {
    await start();
    await move(0, 2);
    await fireEvent.press(peg(0));
    await fireEvent(peg(2), 'longPress');
    expect(pegText(0)).toBe('3,2');
    expect(pegText(2)).toBe('1');
    expect(screen.getByText('Moves 1/7')).toBeOnTheScreen();
  });
});

const SOLVE_THREE: [number, number][] = [[0, 2], [0, 1], [2, 1], [0, 2], [1, 0], [1, 2], [0, 2]];

async function play(moves: [number, number][]) {
  for (const [from, to] of moves) await move(from, to);
  await act(() => jest.advanceTimersByTime(650));
}

beforeEach(async () => {
  await AsyncStorage.clear();
  await loadStars();
});
afterEach(() => jest.restoreAllMocks());

describe('HanoiScreen', () => {
  it('starts level 1 with three disks on the left peg', async () => {
    await start();
    expect(pegText(0)).toBe('3,2,1');
    expect(screen.getByText('Move all 3 disks to another peg')).toBeOnTheScreen();
  });

  it('selects, moves and counts', async () => {
    await start();
    await fireEvent.press(peg(0));
    expect(pegText(0)).toBe('*3,2,1');
    await fireEvent.press(peg(2));
    expect(pegText(2)).toBe('1');
    expect(screen.getByText('Moves 1/7')).toBeOnTheScreen();
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
    expect(screen.getByText('Moves 1/7')).toBeOnTheScreen();
  });

  it('undoes and restarts', async () => {
    await start();
    await move(0, 2);
    await move(0, 1);
    await fireEvent.press(screen.getByText('Undo'));
    expect(pegText(1)).toBe('');
    expect(screen.getByText('Moves 1/7')).toBeOnTheScreen();
    await fireEvent.press(screen.getByText('Restart'));
    expect(pegText(0)).toBe('3,2,1');
    expect(screen.getByText('Moves 0/7')).toBeOnTheScreen();
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
  });

  describe('level select', () => {
    it('replays an earlier level without locking the later ones', async () => {
      await start(3);
      await fireEvent.press(screen.getByRole('button', { name: 'Levels' }));
      expect(screen.getByRole('button', { name: 'Level 3, not solved' })).toBeSelected();
      expect(screen.getByRole('button', { name: 'Level 4, locked' })).toBeDisabled();
      await fireEvent.press(screen.getByRole('button', { name: 'Level 1, not solved' }));
      expect(await screen.findByText('Level 1')).toBeOnTheScreen();
      expect(pegText(0)).toBe('3,2,1');

      await fireEvent.press(screen.getByRole('button', { name: 'Levels' }));
      expect(screen.getByRole('button', { name: 'Level 3, not solved' })).toBeEnabled();
    });

    it('returns to the game in progress', async () => {
      await start();
      await move(0, 2);
      await fireEvent.press(screen.getByRole('button', { name: 'Levels' }));
      await fireEvent.press(screen.getByRole('button', { name: 'Back' }));
      expect(screen.queryByRole('button', { name: /^Level 1,/ })).toBeNull();
      expect(screen.getByText('Moves 1/7')).toBeOnTheScreen();
    });

    it('resumes the game in progress when its own level is picked', async () => {
      await start();
      await move(0, 2);
      await fireEvent.press(screen.getByRole('button', { name: 'Levels' }));
      await fireEvent.press(screen.getByRole('button', { name: 'Level 1, not solved' }));
      expect(screen.getByText('Moves 1/7')).toBeOnTheScreen();
    });
  });

  describe('winning', () => {
    beforeEach(() => jest.useFakeTimers());
    afterEach(() => jest.useRealTimers());

    it('praises a perfect solve and saves the next level', async () => {
      await start();
      await play(SOLVE_THREE);
      expect(screen.getByText(`Perfect! ${minMoves(3)} moves, the minimum possible.`)).toBeOnTheScreen();
      expect(getStars('hanoi')).toEqual({ 1: 3 });
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
      expect(screen.getByText('Moves 1/1')).toBeOnTheScreen();
    });

    it('reports extra moves', async () => {
      await start();
      await play([[0, 1], [1, 2], ...SOLVE_THREE.slice(1)]);
      expect(screen.getByText(`${minMoves(3) + 1} moves. Solve it in ${minMoves(3)} for three stars.`)).toBeOnTheScreen();
      expect(screen.getByLabelText('2 of 3 stars')).toBeOnTheScreen();
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
