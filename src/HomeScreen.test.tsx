import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { HomeScreen } from './HomeScreen';

beforeEach(() => AsyncStorage.clear());

describe('HomeScreen', () => {
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
    jest.mocked(AsyncStorage.getItem).mockReturnValueOnce(pending).mockReturnValueOnce(pending);
    await render(<HomeScreen onOpen={jest.fn()} />);
    expect(screen.queryByText(/Level/)).toBeNull();
  });

  it('opens the chosen game', async () => {
    const onOpen = jest.fn();
    await render(<HomeScreen onOpen={onOpen} />);
    await screen.findAllByText('Level 1 ›');
    await fireEvent.press(screen.getByText('Tower Stack'));
    await fireEvent.press(screen.getByText('Ring Sort'));
    expect(onOpen.mock.calls).toEqual([['hanoi'], ['hoops']]);
  });
});
