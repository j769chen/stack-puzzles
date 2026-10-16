import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { BackHandler } from 'react-native';
import App from './App';
import { getSettings, loadSettings } from './src/settings';

jest.mock('./src/three/Board', () => ({ Board: () => null }));

type BackPressHandler = Parameters<typeof BackHandler.addEventListener>[1];

const backEvent = { type: 'hardwareBackPress', timeStamp: 0 };
let backPress: BackPressHandler = () => false;

beforeEach(async () => {
  await AsyncStorage.clear();
  jest.spyOn(BackHandler, 'addEventListener').mockImplementation((_, handler) => {
    backPress = handler;
    return { remove: jest.fn() };
  });
});

afterEach(() => jest.restoreAllMocks());

async function renderApp() {
  await render(<App />);
  await screen.findAllByText('Level 1 ›');
}

async function open(game: string) {
  await fireEvent.press(screen.getByText(game));
  await screen.findByText(/^Moves 0/);
}

describe('App', () => {
  it('loads saved settings at launch', async () => {
    await loadSettings();
    await AsyncStorage.setItem('settings', JSON.stringify({ haptics: false }));
    await renderApp();
    expect(getSettings().haptics).toBe(false);
    expect(screen.getByRole('switch', { name: 'Haptics' })).toHaveProp('value', false);
  });

  it('starts on the home screen', async () => {
    await renderApp();
    expect(screen.getByText('Stack Puzzles')).toBeOnTheScreen();
  });

  it.each(['Tower Stack', 'Ring Sort', 'Daily Puzzle', 'Tower Sort'])('opens %s and comes back with the Back button', async (game) => {
    await renderApp();
    await open(game);
    expect(screen.queryByText('Stack Puzzles')).toBeNull();
    await fireEvent.press(screen.getByText('‹ Back'));
    expect(await screen.findAllByText('Level 1 ›')).toHaveLength(3);
  });

  it('stops listening for the back button when it unmounts', async () => {
    const remove = jest.fn();
    jest.mocked(BackHandler.addEventListener).mockImplementation(() => ({ remove }));
    const { unmount } = await render(<App />);
    await screen.findAllByText('Level 1 ›');
    unmount();
    expect(remove).toHaveBeenCalled();
  });

  it('returns home on the Android back button, and lets the OS handle it at home', async () => {
    await renderApp();
    expect(backPress(backEvent)).toBe(false);
    await open('Tower Stack');
    let handled: ReturnType<BackPressHandler>;
    await act(() => {
      handled = backPress(backEvent);
    });
    expect(handled).toBe(true);
    expect(await screen.findAllByText('Level 1 ›')).toHaveLength(3);
  });

  it('closes level select on hardware back instead of leaving the game', async () => {
    await renderApp();
    await open('Tower Stack');
    await fireEvent.press(screen.getByRole('button', { name: 'Levels' }));
    expect(screen.getByRole('button', { name: 'Level 1, not solved' })).toBeOnTheScreen();
    let handled: ReturnType<BackPressHandler>;
    await act(() => {
      handled = backPress(backEvent);
    });
    expect(handled).toBe(true);
    expect(screen.queryByRole('button', { name: 'Level 1, not solved' })).toBeNull();
    expect(screen.getByText(/^Moves 0/)).toBeOnTheScreen();
  });
});
