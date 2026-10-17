import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, fireEvent, renderAsync, screen } from '@testing-library/react-native';
import { AppState, type AppStateStatus, Share } from 'react-native';
import * as daily from '../../daily';
import { getStars, loadStars, recordStars } from '../../stars';
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
  jest.spyOn(daily, 'dailyKey').mockReturnValue(TODAY);
  jest.spyOn(logic, 'dailySpec').mockReturnValue({ colors: 2, capacity: 4, moves: [1, 99] });
  jest.spyOn(logic, 'dailyTask').mockImplementation(function* () {
    return DEAL;
  });
});
afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe('DailyScreen', () => {
  it('opens and closes the history from the header', async () => {
    await start();
    jest.mocked(daily.dailyKey).mockRestore();
    await fireEvent.press(screen.getByRole('button', { name: 'History' }));
    expect(screen.getByRole('header', { name: 'History' })).toBeOnTheScreen();
    await fireEvent.press(screen.getAllByRole('button', { name: 'Back' }).at(-1)!);
    expect(screen.queryByRole('header', { name: 'History' })).toBeNull();
  });

  it("deals today's puzzle with the date, best count and no level select", async () => {
    await start();
    expect(logic.dailyTask).toHaveBeenCalledWith(TODAY);
    expect(screen.getByText('Daily Puzzle')).toBeOnTheScreen();
    expect(screen.getByText(daily.dailyLabel(TODAY))).toBeOnTheScreen();
    expect(screen.getByLabelText('3 of 3 stars')).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Levels' })).toBeNull();
  });

  it('reuses the stored deal for the same day and replaces it on a new day', async () => {
    await start();
    await screen.unmountAsync();
    await start();
    expect(logic.dailyTask).toHaveBeenCalledTimes(1);
    await screen.unmountAsync();
    jest.mocked(daily.dailyKey).mockReturnValue(TODAY + 1);
    await start();
    expect(logic.dailyTask).toHaveBeenLastCalledWith(TODAY + 1);
    expect(JSON.parse((await AsyncStorage.getItem('daily.deal'))!).key).toBe(TODAY + 1);
  });

  it("plays today's real deal on its own rod height through to a win", async () => {
    jest.mocked(logic.dailySpec).mockRestore();
    jest.mocked(logic.dailyTask).mockRestore();
    expect(logic.dailySpec(TODAY).capacity).toBe(5);
    const { solution } = logic.generateDaily(TODAY);
    await renderAsync(<DailyScreen onBack={jest.fn()} />);
    await screen.findByText(`Moves 0/${solution.length}`);
    jest.useFakeTimers();
    for (const [from, to] of solution) await pour(from, to);
    await act(() => jest.advanceTimersByTime(650));
    expect(screen.getByText(`Perfect! ${solution.length} moves, the minimum possible.`)).toBeOnTheScreen();
  });

  it("moves on to the new day's puzzle when the app comes back on a later day", async () => {
    const tomorrow = [[1, 0, 0, 0], [1, 1, 0, 1], [], []];
    await start();
    jest.mocked(daily.dailyKey).mockReturnValue(TODAY + 1);
    jest.mocked(logic.dailyTask).mockImplementation(function* () {
      return { rods: tomorrow, solution: logic.solveHoops(tomorrow, 4)! };
    });
    const [, listener] = jest.mocked(AppState.addEventListener).mock.calls.at(-1)!;
    await act(() => (listener as (state: AppStateStatus) => void)('active'));
    expect(await screen.findByText(daily.dailyLabel(TODAY + 1))).toBeOnTheScreen();
    expect(logic.dailyTask).toHaveBeenLastCalledWith(TODAY + 1);
    tomorrow.forEach((rod, i) => expect(screen.getByTestId(`rod-${i}-rings`)).toHaveTextContent(rod.join(',')));
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

  it('shows the streak on the win card and shares the result', async () => {
    jest.useFakeTimers();
    const share = jest.spyOn(Share, 'share').mockResolvedValue({ action: 'sharedAction' });
    recordStars('daily', TODAY - 2, 3);
    recordStars('daily', TODAY - 1, 1);
    await start();
    for (const [from, to] of [[0, 2], [2, 3], [1, 0], [3, 1]]) await pour(from, to);
    await act(() => jest.advanceTimersByTime(650));
    expect(screen.getByText('3-day streak')).toBeOnTheScreen();
    await fireEvent.press(screen.getByText('Share'));
    expect(share).toHaveBeenCalledWith({
      message: `Stack Puzzles Daily · ${daily.dailyLabel(TODAY)}\n★★☆ 4/${DEAL.solution.length} moves\n3-day streak`,
    });
    jest.useRealTimers();
  });
});
