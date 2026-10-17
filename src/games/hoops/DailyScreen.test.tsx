import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, fireEvent, renderAsync, screen, waitFor } from '@testing-library/react-native';
import { Alert, AppState, type AppStateStatus, Share } from 'react-native';
import * as daily from '../../daily';
import { getStars, loadStars, recordStars } from '../../stars';
import { DailyScreen } from './DailyScreen';
import * as logic from './logic';
import { answerAlert, drag, move, rodText } from '../mockBoard';

jest.mock('./HoopBoard', () => ({ HoopBoard: jest.requireActual<typeof import('../mockBoard')>('../mockBoard').MockBoard }));

const TODAY = 20261016;
const RODS: logic.Rods = [[0, 0, 0, 1], [1, 1, 1, 0], [], []];
const DEAL = { rods: RODS, solution: logic.solveHoops(RODS, 4)! };
const START = `Moves 0/${DEAL.solution.length}`;
const TOMORROW: logic.Rods = [[1, 0, 0, 0], [1, 1, 0, 1], [], []];

async function start(onBack = jest.fn()) {
  await renderAsync(<DailyScreen onBack={onBack} />);
  await screen.findByText(START);
  return onBack;
}

async function comeBackTomorrow() {
  jest.mocked(daily.dailyKey).mockReturnValue(TODAY + 1);
  jest.mocked(logic.dailyTask).mockImplementation(function* () {
    return { rods: TOMORROW, solution: logic.solveHoops(TOMORROW, 4)! };
  });
  const [, listener] = jest.mocked(AppState.addEventListener).mock.calls.at(-1)!;
  await act(() => (listener as (state: AppStateStatus) => void)('active'));
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
afterEach(() => jest.restoreAllMocks());

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

  it('moves a dragged ring onto a legal rod and puts it back from an illegal one', async () => {
    await start();
    await drag(0, 2);
    expect(rodText(0)).toBe('0,0,0');
    expect(rodText(2)).toBe('1');
    await drag(1, 2);
    expect(rodText(1)).toBe('1,1,1,0');
    expect(rodText(2)).toBe('1');
    expect(screen.getByText(`Moves 1/${DEAL.solution.length}`)).toBeOnTheScreen();
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
    expect(await AsyncStorage.getItem(`daily.deal.${TODAY + 1}`)).not.toBeNull();
    await waitFor(async () => expect(await AsyncStorage.getItem(`daily.deal.${TODAY}`)).toBeNull());
  });

  it("plays today's real deal on its own rod height through to a win", async () => {
    jest.mocked(logic.dailySpec).mockRestore();
    jest.mocked(logic.dailyTask).mockRestore();
    expect(logic.dailySpec(TODAY).capacity).toBe(5);
    const { solution } = logic.generateDaily(TODAY);
    await renderAsync(<DailyScreen onBack={jest.fn()} />);
    await screen.findByText(`Moves 0/${solution.length}`);
    jest.useFakeTimers();
    for (const [from, to] of solution) await move(from, to);
    await act(() => jest.advanceTimersByTime(650));
    expect(screen.getByText(`Perfect! ${solution.length} moves, the minimum possible.`)).toBeOnTheScreen();
  });

  it("moves on to the new day's puzzle when the app comes back on a later day", async () => {
    await start();
    await comeBackTomorrow();
    expect(await screen.findByText(daily.dailyLabel(TODAY + 1))).toBeOnTheScreen();
    expect(logic.dailyTask).toHaveBeenLastCalledWith(TODAY + 1);
    TOMORROW.forEach((rod, i) => expect(rodText(i)).toBe(rod.join(',')));
  });

  it('keeps a started puzzle when the app comes back on a later day, and moves on once it is restarted', async () => {
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    await start();
    await move(0, 2);
    await comeBackTomorrow();
    expect(screen.getByText(daily.dailyLabel(TODAY))).toBeOnTheScreen();
    expect(screen.getByText(`Moves 1/${DEAL.solution.length}`)).toBeOnTheScreen();
    expect(rodText(2)).toBe('1');
    expect(logic.dailyTask).not.toHaveBeenCalledWith(TODAY + 1);

    jest.mocked(daily.dailyKey).mockRestore();
    await fireEvent.press(screen.getByRole('button', { name: 'History' }));
    expect(screen.getByLabelText(`${daily.dailyLabel(TODAY + 1)}, not solved`)).toBeOnTheScreen();
    await fireEvent.press(screen.getAllByRole('button', { name: 'Back' }).at(-1)!);

    await fireEvent.press(screen.getByText('Restart'));
    await answerAlert('Restart');
    expect(await screen.findByText(daily.dailyLabel(TODAY + 1))).toBeOnTheScreen();
    TOMORROW.forEach((rod, i) => expect(rodText(i)).toBe(rod.join(',')));
  });

  it('keeps a solved puzzle when the app comes back on a later day, and moves on with Play again', async () => {
    jest.useFakeTimers();
    await start();
    for (const [from, to] of DEAL.solution) await move(from, to);
    await act(() => jest.advanceTimersByTime(650));
    await comeBackTomorrow();
    expect(screen.getByText(/^Perfect! \d+ moves, the minimum possible\.$/)).toBeOnTheScreen();
    expect(getStars('daily')).toEqual({ [TODAY]: 3 });

    await fireEvent.press(screen.getByText('Play again'));
    expect(await screen.findByText(daily.dailyLabel(TODAY + 1))).toBeOnTheScreen();
    TOMORROW.forEach((rod, i) => expect(rodText(i)).toBe(rod.join(',')));
  });

  it("records today's stars and closes with Done", async () => {
    jest.useFakeTimers();
    const onBack = await start();
    for (const [from, to] of DEAL.solution) await move(from, to);
    await act(() => jest.advanceTimersByTime(650));
    expect(screen.getByText(/^Perfect! \d+ moves, the minimum possible\.$/)).toBeOnTheScreen();
    expect(getStars('daily')).toEqual({ [TODAY]: 3 });
    await fireEvent.press(screen.getByText('Done'));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('shows the streak on the win card and shares the result', async () => {
    jest.useFakeTimers();
    const share = jest.spyOn(Share, 'share').mockResolvedValue({ action: 'sharedAction' });
    recordStars('daily', TODAY - 2, 3);
    recordStars('daily', TODAY - 1, 1);
    await start();
    for (const [from, to] of [[0, 2], [2, 3], [1, 0], [3, 1]] as const) await move(from, to);
    await act(() => jest.advanceTimersByTime(650));
    expect(screen.getByText('3-day streak')).toBeOnTheScreen();
    await fireEvent.press(screen.getByText('Share'));
    expect(share).toHaveBeenCalledWith({
      message: `Stack Puzzles Daily · ${daily.dailyLabel(TODAY)}\n★★☆ 4/${DEAL.solution.length} moves\n3-day streak`,
    });
  });
});
