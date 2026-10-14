import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { BackHandler } from 'react-native';
import App from './App';

jest.mock('./src/three/Board', () => ({ Board: () => null }));

let backPress: () => boolean | null | undefined = () => false;

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
  await screen.findByText('Moves 0');
}

describe('App', () => {
  it('starts on the home screen', async () => {
    await renderApp();
    expect(screen.getByText('Stack Puzzles')).toBeOnTheScreen();
  });

  it.each(['Tower Stack', 'Ring Sort'])('opens %s and comes back with the Back button', async (game) => {
    await renderApp();
    await open(game);
    expect(screen.queryByText('Stack Puzzles')).toBeNull();
    await fireEvent.press(screen.getByText('‹ Back'));
    expect(await screen.findAllByText('Level 1 ›')).toHaveLength(2);
  });

  it('returns home on the Android back button, and lets the OS handle it at home', async () => {
    await renderApp();
    expect(backPress()).toBe(false);
    await open('Tower Stack');
    let handled: boolean | null | undefined;
    await act(() => {
      handled = backPress();
    });
    expect(handled).toBe(true);
    expect(await screen.findAllByText('Level 1 ›')).toHaveLength(2);
  });
});
