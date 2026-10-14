import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { HoopScreen } from './HoopScreen';
import * as logic from './logic';

type MockBoardProps = { rods: number[][]; selected: number | null; hint: [number, number] | null; onPress: (rod: number) => void };

jest.mock('./HoopBoard', () => {
  const { Pressable, Text } = jest.requireActual<typeof import('react-native')>('react-native');
  return {
    HoopBoard: ({ rods, selected, hint, onPress }: MockBoardProps) => (
      <>
        <Text testID="hint">{hint ? hint.join('>') : ''}</Text>
        {rods.map((rod, i) => (
          <Pressable key={i} testID={`rod-${i}`} onPress={() => onPress(i)}>
            <Text testID={`rod-${i}-rings`}>{`${selected === i ? '*' : ''}${rod.join(',')}`}</Text>
          </Pressable>
        ))}
      </>
    ),
  };
});

const rodText = (i: number) => screen.getByTestId(`rod-${i}-rings`).props.children as string;
const hintText = () => screen.getByTestId('hint').props.children as string;

async function pour(from: number, to: number) {
  await fireEvent.press(screen.getByTestId(`rod-${from}`));
  await fireEvent.press(screen.getByTestId(`rod-${to}`));
}

async function start(rods?: logic.Rods) {
  if (rods) jest.spyOn(logic, 'generateLevel').mockReturnValueOnce(rods);
  await render(<HoopScreen onBack={jest.fn()} />);
  await screen.findByText('Level 1');
}

beforeEach(() => AsyncStorage.clear());
afterEach(() => jest.restoreAllMocks());

describe('HoopScreen', () => {
  it('deals the seeded level', async () => {
    await start();
    logic.generateLevel(1).forEach((rod, i) => expect(rodText(i)).toBe(rod.join(',')));
  });

  it('shows the fewest moves the level needs', async () => {
    await start([[0, 1], [1], [0, 0, 0, 1], [], [1]]);
    expect(screen.getByText('Sort each color onto its own rod · best 4')).toBeOnTheScreen();
  });

  it('deals taller rods on later levels', async () => {
    await AsyncStorage.setItem('hoops.level', '30');
    await render(<HoopScreen onBack={jest.fn()} />);
    await screen.findByText('Level 30');
    const { colors, capacity } = logic.levelSpec(30);
    expect(capacity).toBe(5);
    for (let i = 0; i < colors; i++) expect(rodText(i).split(',')).toHaveLength(capacity);
  });

  it('pours a matching run and counts the move', async () => {
    await start([[0, 1], [1], [0, 0, 0, 1], [], [1]]);
    await pour(0, 1);
    expect(rodText(1)).toBe('1,1');
    expect(screen.getByText('Moves 1')).toBeOnTheScreen();
  });

  it('will not select an empty or complete rod', async () => {
    await start([[0, 0, 0, 0], [], [1, 1, 1], [1]]);
    await fireEvent.press(screen.getByTestId('rod-0'));
    await fireEvent.press(screen.getByTestId('rod-1'));
    expect(rodText(0)).toBe('0,0,0,0');
    expect(rodText(1)).toBe('');
  });

  it('switches selection when a pour is not allowed, and deselects on a second tap', async () => {
    await start([[0, 0, 1], [1, 1, 0], [0, 1], []]);
    await pour(0, 1);
    expect(rodText(1)).toBe('*1,1,0');
    await fireEvent.press(screen.getByTestId('rod-1'));
    expect(rodText(1)).toBe('1,1,0');
  });

  it('undoes and restarts', async () => {
    await start([[0, 1], [1], [0, 0, 0, 1], [], [1]]);
    await pour(0, 1);
    await pour(4, 1);
    await fireEvent.press(screen.getByText('Undo'));
    expect(rodText(1)).toBe('1,1');
    expect(rodText(4)).toBe('1');
    await fireEvent.press(screen.getByText('Restart'));
    expect(rodText(0)).toBe('0,1');
    expect(screen.getByText('Moves 0')).toBeOnTheScreen();
  });

  it('keeps following the hint plan while the player follows it', async () => {
    await start();
    const solve = jest.spyOn(logic, 'solveHoops');
    await fireEvent.press(screen.getByText('Hint'));
    const [from, to] = hintText().split('>').map(Number);
    await pour(from, to);
    await fireEvent.press(screen.getByText('Hint'));
    expect(solve).toHaveBeenCalledTimes(1);
    expect(hintText()).not.toBe('');
  });

  it('replans after the player leaves the hint plan', async () => {
    await start([[0, 1], [1], [0, 0, 0, 1], [], [1]]);
    const solve = jest.spyOn(logic, 'solveHoops');
    await fireEvent.press(screen.getByText('Hint'));
    expect(hintText()).toBe('0>1');
    await pour(4, 1);
    await fireEvent.press(screen.getByText('Hint'));
    expect(solve).toHaveBeenCalledTimes(2);
  });

  it('reports a dead end', async () => {
    await start([[0, 2, 1, 1], [1, 2, 0, 0], [2, 1, 2, 0], []]);
    await pour(0, 3);
    expect(screen.getByText('No moves left. Undo or restart.')).toBeOnTheScreen();
    await fireEvent.press(screen.getByText('Hint'));
    expect(screen.getByText('No solution from here. Try undo.')).toBeOnTheScreen();
  });

  describe('winning', () => {
    beforeEach(() => jest.useFakeTimers());
    afterEach(() => jest.useRealTimers());

    it('solves by following hints and saves the next level', async () => {
      await start();
      while (!screen.queryByText('Solved!')) {
        await fireEvent.press(screen.getByText('Hint'));
        const [from, to] = hintText().split('>').map(Number);
        await pour(from, to);
        await act(() => jest.advanceTimersByTime(650));
      }
      expect(screen.getByText(/^Perfect! \d+ moves, the minimum possible\.$/)).toBeOnTheScreen();
      await fireEvent.press(screen.getByText('Next level'));
      expect(await screen.findByText('Level 2')).toBeOnTheScreen();
      expect(await AsyncStorage.getItem('hoops.level')).toBe('2');
    });

    it('reports extra moves against the minimum', async () => {
      await start([[0, 1], [1], [0, 0, 0, 1], [], [1]]);
      await pour(4, 3);
      for (const [from, to] of logic.solveHoops([[0, 1], [1], [0, 0, 0, 1], [1], []], 4)!) await pour(from, to);
      await act(() => jest.advanceTimersByTime(650));
      expect(screen.getByText(/^\d+ moves\. The minimum is 4\.$/)).toBeOnTheScreen();
    });
  });
});
