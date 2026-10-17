import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { AppState, type AppStateStatus, type ColorSchemeName, type StyleProp, StyleSheet, type ViewStyle } from 'react-native';
import { dailyKey, previousDay } from './daily';
import { HomeScreen } from './HomeScreen';
import { getSettings, loadSettings } from './settings';
import { loadStars, recordStars } from './stars';

let mockScheme: ColorSchemeName = 'light';
jest.mock('react-native/Libraries/Utilities/useColorScheme', () => ({ __esModule: true, default: () => mockScheme }));

beforeEach(async () => {
  mockScheme = 'light';
  await AsyncStorage.clear();
  await loadSettings();
  await loadStars();
});

type Node = { type: unknown; props: { style?: StyleProp<ViewStyle> } };

const chipWidths = (game: RegExp) =>
  screen
    .getByRole('button', { name: game })
    .findAll((node: Node) => typeof node.type === 'string' && StyleSheet.flatten(node.props.style)?.height === 14)
    .map((chip: Node) => StyleSheet.flatten(chip.props.style)?.width);

describe('HomeScreen', () => {
  it('tapers the tower icon and keeps every ring in the ring icon the same size', async () => {
    await render(<HomeScreen onOpen={jest.fn()} />);
    await screen.findAllByText('Level 1 ›');
    expect(chipWidths(/^Tower Stack/)).toEqual([30, 44, 58]);
    expect(chipWidths(/^Ring Sort/)).toEqual([44, 44, 44]);
  });

  it('shows each game at its saved level', async () => {
    await AsyncStorage.multiSet([
      ['hanoi.level', '4'],
      ['hoops.level', '12'],
    ]);
    await render(<HomeScreen onOpen={jest.fn()} />);
    expect(await screen.findByText('Level 4 ›')).toBeOnTheScreen();
    expect(screen.getByText('Level 12 ›')).toBeOnTheScreen();
  });

  it('hides levels until storage loads', async () => {
    const pending = new Promise<null>(() => {});
    jest.mocked(AsyncStorage.getItem).mockReturnValueOnce(pending).mockReturnValueOnce(pending).mockReturnValueOnce(pending);
    await render(<HomeScreen onOpen={jest.fn()} />);
    expect(screen.queryByText(/Level/)).toBeNull();
  });

  it('labels each game card with its level', async () => {
    await AsyncStorage.setItem('hanoi.level', '4');
    await render(<HomeScreen onOpen={jest.fn()} />);
    expect(await screen.findByRole('button', { name: 'Tower Stack, level 4' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Ring Sort, level 1' })).toBeOnTheScreen();
  });

  it('shows the stars earned in each game', async () => {
    recordStars('hanoi', 1, 3);
    recordStars('hanoi', 2, 2);
    recordStars('daily', 20261015, 1);
    await render(<HomeScreen onOpen={jest.fn()} />);
    expect(await screen.findByRole('button', { name: 'Tower Stack, level 1, 5 stars' })).toBeOnTheScreen();
    expect(screen.getByText('★ 5')).toBeOnTheScreen();
    expect(screen.getByText('★ 1')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Daily Puzzle, play today, 1 star' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Ring Sort, level 1' })).toBeOnTheScreen();
  });

  it("marks today's daily puzzle as solved once it has stars", async () => {
    recordStars('daily', dailyKey(new Date()), 2);
    await render(<HomeScreen onOpen={jest.fn()} />);
    expect(await screen.findByRole('button', { name: 'Daily Puzzle, solved today, 2 stars' })).toBeOnTheScreen();
    expect(screen.getByText('Solved today ›')).toBeOnTheScreen();
    await screen.findAllByText('Level 1 ›');
  });

  it('notices a new day when the app comes back to the foreground', async () => {
    jest.useFakeTimers({ now: new Date(2026, 9, 16, 22, 0) });
    recordStars('daily', 20261016, 3);
    await render(<HomeScreen onOpen={jest.fn()} />);
    await screen.findAllByText('Level 1 ›');
    expect(screen.getByText('Solved today ›')).toBeOnTheScreen();
    jest.setSystemTime(new Date(2026, 9, 17, 8, 0));
    const [, listener] = jest.mocked(AppState.addEventListener).mock.calls.at(-1)!;
    await act(() => (listener as (state: AppStateStatus) => void)('active'));
    expect(screen.getByText('Play today ›')).toBeOnTheScreen();
  });

  it('shows the daily streak, still alive before today is played', async () => {
    const today = dailyKey(new Date());
    const yesterday = previousDay(today);
    recordStars('daily', previousDay(yesterday), 3);
    recordStars('daily', yesterday, 3);
    await render(<HomeScreen onOpen={jest.fn()} />);
    expect(await screen.findByText('Play today · 2-day streak ›')).toBeOnTheScreen();
    await screen.findAllByText('Level 1 ›');
  });

  it('hides the star count until a game has stars', async () => {
    await render(<HomeScreen onOpen={jest.fn()} />);
    await screen.findAllByText('Level 1 ›');
    expect(screen.queryByText(/★/)).toBeNull();
  });

  it('shows sound and haptics switches that reflect saved settings', async () => {
    await AsyncStorage.setItem('settings', JSON.stringify({ sound: false }));
    await loadSettings();
    await render(<HomeScreen onOpen={jest.fn()} />);
    await screen.findAllByText('Level 1 ›');
    expect(screen.getByRole('switch', { name: 'Sound' })).toHaveProp('value', false);
    expect(screen.getByRole('switch', { name: 'Haptics' })).toHaveProp('value', true);
  });

  it('turns sound and haptics off and on', async () => {
    await render(<HomeScreen onOpen={jest.fn()} />);
    await screen.findAllByText('Level 1 ›');
    await fireEvent(screen.getByRole('switch', { name: 'Sound' }), 'valueChange', false);
    await fireEvent(screen.getByRole('switch', { name: 'Haptics' }), 'valueChange', false);
    expect(getSettings()).toEqual({ sound: false, haptics: false, patterns: false });
    expect(screen.getByRole('switch', { name: 'Sound' })).toHaveProp('value', false);

    await fireEvent(screen.getByRole('switch', { name: 'Sound' }), 'valueChange', true);
    expect(getSettings()).toEqual({ sound: true, haptics: false, patterns: false });
  });

  it('turns color-blind patterns on and off', async () => {
    await render(<HomeScreen onOpen={jest.fn()} />);
    await screen.findAllByText('Level 1 ›');
    expect(screen.getByRole('switch', { name: 'Color-blind patterns' })).toHaveProp('value', false);
    await fireEvent(screen.getByRole('switch', { name: 'Color-blind patterns' }), 'valueChange', true);
    expect(getSettings().patterns).toBe(true);
    await fireEvent(screen.getByRole('switch', { name: 'Color-blind patterns' }), 'valueChange', false);
    expect(getSettings().patterns).toBe(false);
  });

  it('follows the system dark mode', async () => {
    const background = () => {
      let node = screen.getByRole('header', { name: 'Stack Puzzles' }).parent;
      while (node && !StyleSheet.flatten(node.props.style)?.backgroundColor) node = node.parent;
      return StyleSheet.flatten(node?.props.style)?.backgroundColor;
    };
    await render(<HomeScreen onOpen={jest.fn()} />);
    await screen.findAllByText('Level 1 ›');
    expect(background()).toBe('#F4EFE6');
    mockScheme = 'dark';
    await screen.rerender(<HomeScreen onOpen={jest.fn()} />);
    expect(background()).toBe('#1C1916');
    expect(StyleSheet.flatten(screen.getByText('Tower Stack').props.style).color).toBe('#F2EDE4');
  });

  it('opens the chosen game', async () => {
    const onOpen = jest.fn();
    await render(<HomeScreen onOpen={onOpen} />);
    await screen.findAllByText('Level 1 ›');
    await fireEvent.press(screen.getByText('Tower Stack'));
    await fireEvent.press(screen.getByText('Ring Sort'));
    await fireEvent.press(screen.getByText('Daily Puzzle'));
    await fireEvent.press(screen.getByText('Tower Sort'));
    expect(onOpen.mock.calls).toEqual([['hanoi'], ['hoops'], ['daily'], ['towersort']]);
  });
});
