import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { HomeScreen } from './HomeScreen';
import { getSettings, loadSettings } from './settings';

beforeEach(async () => {
  await AsyncStorage.clear();
  await loadSettings();
});

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

  it('labels each game card with its level', async () => {
    await AsyncStorage.setItem('hanoi.level', '4');
    await render(<HomeScreen onOpen={jest.fn()} />);
    expect(await screen.findByRole('button', { name: 'Tower Stack, level 4' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Ring Sort, level 1' })).toBeOnTheScreen();
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
    expect(getSettings()).toEqual({ sound: false, haptics: false });
    expect(screen.getByRole('switch', { name: 'Sound' })).toHaveProp('value', false);

    await fireEvent(screen.getByRole('switch', { name: 'Sound' }), 'valueChange', true);
    expect(getSettings()).toEqual({ sound: true, haptics: false });
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
