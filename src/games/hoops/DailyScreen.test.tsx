import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, fireEvent, renderAsync, screen } from '@testing-library/react-native';
import { getStars, loadStars } from '../../stars';
import { DailyScreen } from './DailyScreen';
import * as logic from './logic';

type MockBoardProps = { rods: number[][]; onPress: (rod: number) => void };

jest.mock('./HoopBoard', () => {
  const { Pressable, Text } = jest.requireActual<typeof import('react-native')>('react-native');
  return {
    HoopBoard: ({ rods, onPress }: MockBoardProps) =>
      rods.map((rod, i) => (
        <Pressable key={i} testID={`rod-${i}`} onPress={() => onPress(i)}>
          <Text testID={`rod-${i}-rings`}>{rod.join(',')}</Text>
        </Pressable>
      )),
  };
});

const TODAY = 20261016;
const RODS: logic.Rods = [[0, 0, 0, 1], [1, 1, 1, 0], [], []];
const DEAL = { rods: RODS, solution: logic.solveHoops(RODS, 4)! };
const START = `Moves 0/${DEAL.solution.length}`;

async function pour(from: number, to: number) {
  await fireEvent.press(screen.getByTestId(`rod-${from}`));
  await fireEvent.press(screen.getByTestId(`rod-${to}`));
}

async function start(onBack = jest.fn()) {
  await renderAsync(<DailyScreen onBack={onBack} />);
  await screen.findByText(START);
  return onBack;
}

beforeEach(async () => {
  await AsyncStorage.clear();
  await loadStars();
  jest.spyOn(logic, 'dailyKey').mockReturnValue(TODAY);
  jest.spyOn(logic, 'dailySpec').mockReturnValue({ colors: 2, capacity: 4 });
  jest.spyOn(logic, 'generateDaily').mockReturnValue(DEAL);
});
afterEach(() => jest.restoreAllMocks());

describe('DailyScreen', () => {
  it("deals today's puzzle with the date, best count and no level select", async () => {
    await start();
    expect(logic.generateDaily).toHaveBeenCalledWith(TODAY);
    expect(screen.getByText('Daily Puzzle')).toBeOnTheScreen();
    const date = logic.dailyDate(TODAY).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
    expect(screen.getByText(date)).toBeOnTheScreen();
    expect(screen.getByLabelText('3 of 3 stars')).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Levels' })).toBeNull();
  });

  it('reuses the stored deal for the same day and replaces it on a new day', async () => {
    await start();
    await screen.unmountAsync();
    await start();
    expect(logic.generateDaily).toHaveBeenCalledTimes(1);
    await screen.unmountAsync();
    jest.mocked(logic.dailyKey).mockReturnValue(TODAY + 1);
    await start();
    expect(logic.generateDaily).toHaveBeenLastCalledWith(TODAY + 1);
    expect(JSON.parse((await AsyncStorage.getItem('daily.deal'))!).key).toBe(TODAY + 1);
  });

  it("records today's stars and closes with Done", async () => {
    jest.useFakeTimers();
    const onBack = await start();
    for (const [from, to] of DEAL.solution) await pour(from, to);
    await act(() => jest.advanceTimersByTime(650));
    expect(screen.getByText(/^Perfect! \d+ moves, the minimum possible\.$/)).toBeOnTheScreen();
    expect(getStars('daily')).toEqual({ [TODAY]: 3 });
    await fireEvent.press(screen.getByText('Done'));
    expect(onBack).toHaveBeenCalledTimes(1);
    jest.useRealTimers();
  });
});
