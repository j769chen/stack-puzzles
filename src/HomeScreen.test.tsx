import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { type StyleProp, StyleSheet, type ViewStyle } from 'react-native';
import { HomeScreen } from './HomeScreen';
import { getSettings, loadSettings } from './settings';
import { loadStars, recordStars } from './stars';

beforeEach(async () => {
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

  it('shows the stars earned in each game', async () => {
    recordStars('hanoi', 1, 3);
    recordStars('hanoi', 2, 2);
    recordStars('hoops', 1, 1);
    await render(<HomeScreen onOpen={jest.fn()} />);
    expect(await screen.findByRole('button', { name: 'Tower Stack, level 1, 5 stars' })).toBeOnTheScreen();
    expect(screen.getByText('★ 5')).toBeOnTheScreen();
    expect(screen.getByText('★ 1')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Ring Sort, level 1, 1 star' })).toBeOnTheScreen();
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
