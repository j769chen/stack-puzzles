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

async function open(game: string) {
  await fireEvent.press(await screen.findByText(game));
  await screen.findByText('Moves 0');
}

describe('App', () => {
  it('starts on the home screen', async () => {
    await render(<App />);
    expect(screen.getByText('Stack Puzzles')).toBeOnTheScreen();
  });

  it.each(['Tower Stack', 'Ring Sort'])('opens %s and comes back with the Back button', async (game) => {
    await render(<App />);
    await open(game);
    expect(screen.queryByText('Stack Puzzles')).toBeNull();
    await fireEvent.press(screen.getByText('‹ Back'));
    expect(screen.getByText('Stack Puzzles')).toBeOnTheScreen();
  });

  it('returns home on the Android back button, and lets the OS handle it at home', async () => {
    await render(<App />);
    expect(backPress()).toBe(false);
    await open('Tower Stack');
    let handled: boolean | null | undefined;
    await act(() => {
      handled = backPress();
    });
    expect(handled).toBe(true);
    expect(screen.getByText('Stack Puzzles')).toBeOnTheScreen();
  });
});
