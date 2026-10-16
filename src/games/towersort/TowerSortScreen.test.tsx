import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, fireEvent, renderAsync, screen } from '@testing-library/react-native';
import { TowerSortScreen } from './TowerSortScreen';
import * as logic from './logic';

let mockScreenReader = false;
jest.mock('../../useScreenReader', () => ({ useScreenReader: () => mockScreenReader }));

type MockBoardProps = {
  rods: number[][];
  selected: number | null;
  onPress: (rod: number) => void;
  onDrop: (rod: number) => void;
};

jest.mock('../hoops/HoopBoard', () => {
  const { Pressable, Text } = jest.requireActual<typeof import('react-native')>('react-native');
  return {
    HoopBoard: ({ rods, selected, onPress, onDrop }: MockBoardProps) =>
      rods.map((rod, i) => (
        <Pressable key={i} testID={`rod-${i}`} onPress={() => onPress(i)} onLongPress={() => onDrop(i)}>
          <Text testID={`rod-${i}-rings`}>{`${selected === i ? '*' : ''}${rod.join(',')}`}</Text>
        </Pressable>
      )),
  };
});

const rodText = (i: number) => screen.getByTestId(`rod-${i}-rings`).props.children as string;

async function move(from: number, to: number) {
  await fireEvent.press(screen.getByTestId(`rod-${from}`));
  await fireEvent.press(screen.getByTestId(`rod-${to}`));
}

const START = [[2, 1], [5, 0], [8, 7, 6], [4, 3], []];

async function start(rods = START) {
  jest.spyOn(logic, 'towerLevel').mockReturnValue(rods);
  await renderAsync(<TowerSortScreen onBack={jest.fn()} />);
  await screen.findByText('Level 1');
}

beforeEach(() => AsyncStorage.clear());
afterEach(() => {
  jest.restoreAllMocks();
  mockScreenReader = false;
});

describe('TowerSortScreen', () => {
  it('deals the level with a plain move count and the size rule', async () => {
    await start();
    START.forEach((rod, i) => expect(rodText(i)).toBe(rod.join(',')));
    expect(screen.getByText('Moves 0')).toBeOnTheScreen();
    expect(screen.getByText('Sort each color onto its own rod. A ring only fits on a bigger one.')).toBeOnTheScreen();
    expect(screen.queryByLabelText(/of 3 stars/)).toBeNull();
  });

  it('only lets a ring onto an empty rod or a bigger ring', async () => {
    await start();
    await move(3, 1);
    expect(rodText(1)).toBe('*5,0');
    await fireEvent.press(screen.getByTestId('rod-1'));
    await move(0, 3);
    expect(rodText(3)).toBe('*4,3');
    await fireEvent.press(screen.getByTestId('rod-3'));
    expect(screen.getByText('Moves 0')).toBeOnTheScreen();
    await move(1, 0);
    expect(rodText(0)).toBe('2,1,0');
    await move(3, 4);
    expect(rodText(4)).toBe('3');
    expect(screen.getByText('Moves 2')).toBeOnTheScreen();
  });

  it('moves a dragged ring onto a bigger one and puts it back from a smaller one', async () => {
    await start();
    await fireEvent.press(screen.getByTestId('rod-0'));
    await fireEvent(screen.getByTestId('rod-3'), 'longPress');
    expect(rodText(0)).toBe('2,1');
    expect(rodText(3)).toBe('4,3');
    await fireEvent(screen.getByTestId('rod-1'), 'longPress');
    expect(rodText(1)).toBe('5,0');
    await fireEvent.press(screen.getByTestId('rod-1'));
    await fireEvent(screen.getByTestId('rod-0'), 'longPress');
    expect(rodText(0)).toBe('2,1,0');
    expect(screen.getByText('Moves 1')).toBeOnTheScreen();
  });

  it('names rings by color and size for screen readers', async () => {
    mockScreenReader = true;
    await start();
    expect(screen.getByRole('button', { name: 'Rod 1, red 3, red 2 from the bottom' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Rod 3, complete, yellow' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Rod 5, empty' })).toBeOnTheScreen();
  });

  it('picks an earlier level from level select, without stars', async () => {
    await AsyncStorage.setItem('towersort.level', '3');
    jest.spyOn(logic, 'towerLevel').mockReturnValue(START);
    await renderAsync(<TowerSortScreen onBack={jest.fn()} />);
    await screen.findByText('Level 3');
    await fireEvent.press(screen.getByRole('button', { name: 'Levels' }));
    expect(screen.queryByLabelText(/of 3 stars/)).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: 'Level 2' }));
    expect(await screen.findByText('Level 2')).toBeOnTheScreen();
    expect(logic.towerLevel).toHaveBeenLastCalledWith(2);
    await fireEvent.press(screen.getByRole('button', { name: 'Levels' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Back' }));
    expect(screen.queryByRole('button', { name: 'Level 1' })).toBeNull();
  });

  it('wins a sorted board and moves on to the next level', async () => {
    jest.useFakeTimers();
    await start([[2, 1], [5, 4, 3], [8, 7, 6], [0], []]);
    await move(3, 0);
    await act(() => jest.advanceTimersByTime(650));
    expect(screen.getByText('Sorted in 1 moves.')).toBeOnTheScreen();
    expect(logic.towerLevel).toHaveBeenCalledWith(2);
    await fireEvent.press(screen.getByText('Next level'));
    expect(await screen.findByText('Level 2')).toBeOnTheScreen();
    expect(await AsyncStorage.getItem('towersort.level')).toBe('2');
    jest.useRealTimers();
  });
});
