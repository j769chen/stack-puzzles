import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, fireEvent, renderAsync, screen, waitFor } from '@testing-library/react-native';
import { AccessibilityInfo } from 'react-native';
import { feedback } from '../../feedback';
import { getStars, loadStars } from '../../stars';
import { HoopScreen } from './HoopScreen';
import * as logic from './logic';
import { move, rodText } from '../mockBoard';

let mockScreenReader = false;
jest.mock('../../useScreenReader', () => ({ useScreenReader: () => mockScreenReader }));

jest.mock('./HoopBoard', () => ({ HoopBoard: jest.requireActual<typeof import('../mockBoard')>('../mockBoard').MockBoard }));

async function start(rods?: logic.Rods) {
  if (rods) {
    const deal = { rods, solution: logic.solveHoops(rods, 4)! };
    jest.spyOn(logic, 'levelTask').mockImplementationOnce(function* () {
      return deal;
    });
  }
  await renderAsync(<HoopScreen onBack={jest.fn()} />);
  await screen.findByText('Level 1');
}

beforeEach(async () => {
  await AsyncStorage.clear();
  await loadStars();
});
afterEach(() => jest.restoreAllMocks());

describe('HoopScreen', () => {
  it('deals the seeded level', async () => {
    await start();
    logic.generateLevel(1).rods.forEach((rod, i) => expect(rodText(i)).toBe(rod.join(',')));
  });

  it('reuses the stored deal instead of generating it again', async () => {
    await start();
    await screen.unmountAsync();
    const generate = jest.spyOn(logic, 'levelTask');
    await renderAsync(<HoopScreen onBack={jest.fn()} />);
    await screen.findByText('Level 1');
    expect(generate).not.toHaveBeenCalled();
    logic.generateLevel(1).rods.forEach((rod, i) => expect(rodText(i)).toBe(rod.join(',')));
  });

  it('regenerates when the stored deal does not fit the level', async () => {
    await AsyncStorage.setItem('hoops.deal.1', JSON.stringify({ rods: [[0, 0, 0, 0], []], solution: [[0, 1]] }));
    await start();
    logic.generateLevel(1).rods.forEach((rod, i) => expect(rodText(i)).toBe(rod.join(',')));
  });

  it('keeps only the current and next levels in storage', async () => {
    await AsyncStorage.multiSet([1, 2, 3, 5, 6].map((level) => [`hoops.deal.${level}`, 'old']));
    await AsyncStorage.setItem('hoops.level', '4');
    await renderAsync(<HoopScreen onBack={jest.fn()} />);
    await screen.findByText('Level 4');
    await waitFor(async () => {
      const deals = (await AsyncStorage.getAllKeys()).filter((key) => key.startsWith('hoops.deal.'));
      expect(deals.sort()).toEqual(['hoops.deal.4', 'hoops.deal.5']);
    });
  });

  it('keeps Back working while the level is being dealt', async () => {
    const deal = logic.generateLevel(1);
    let dealt = false;
    jest.spyOn(logic, 'levelTask').mockImplementationOnce(function* () {
      while (!dealt) yield;
      return deal;
    });
    const onBack = jest.fn();
    await renderAsync(<HoopScreen onBack={onBack} />);
    expect(await screen.findByLabelText('Loading')).toBeOnTheScreen();
    expect(screen.getByRole('header', { name: 'Ring Sort' })).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Back' }));
    expect(onBack).toHaveBeenCalledTimes(1);
    dealt = true;
    expect(await screen.findByText('Level 1')).toBeOnTheScreen();
  });

  it('deals taller rods on later levels', async () => {
    await AsyncStorage.setItem('hoops.level', '30');
    await renderAsync(<HoopScreen onBack={jest.fn()} />);
    await screen.findByText('Level 30');
    const { colors, capacity } = logic.levelSpec(30);
    expect(capacity).toBe(5);
    for (let i = 0; i < colors; i++) expect(rodText(i).split(',')).toHaveLength(capacity);
  });

  it('moves one ring per tap, even when the ring below it matches', async () => {
    await start([[0, 1, 1], [1], [0, 0, 0, 1], [], []]);
    await move(0, 1);
    expect(rodText(0)).toBe('0,1');
    expect(rodText(1)).toBe('1,1');
    await move(0, 1);
    expect(rodText(0)).toBe('0');
    expect(rodText(1)).toBe('1,1,1');
    expect(screen.getByText('Moves 2')).toBeOnTheScreen();
  });

  it('moves a ring onto a matching ring and counts the move', async () => {
    await start([[0, 1], [1], [0, 0, 0, 1], [], [1]]);
    await move(0, 1);
    expect(rodText(1)).toBe('1,1');
    expect(screen.getByText('Moves 1')).toBeOnTheScreen();
  });

  it('chimes when a pour completes a rod, and taps otherwise', async () => {
    const drop = jest.spyOn(feedback, 'drop');
    const complete = jest.spyOn(feedback, 'complete');
    await start([[0, 1], [1], [0, 0, 0, 1], [], [1]]);
    await move(0, 1);
    expect(drop).toHaveBeenCalledTimes(1);
    await move(4, 1);
    await move(2, 1);
    expect(complete).toHaveBeenCalledTimes(1);
    expect(drop).toHaveBeenCalledTimes(2);
  });

  it('will not select an empty or complete rod', async () => {
    await start([[0, 0, 0, 0], [], [1, 1, 1], [1]]);
    await fireEvent.press(screen.getByTestId('rod-0'));
    await fireEvent.press(screen.getByTestId('rod-1'));
    expect(rodText(0)).toBe('0,0,0,0');
    expect(rodText(1)).toBe('');
  });

  it('switches selection when a pour is not allowed, and deselects on a second tap', async () => {
    await start([[0, 0, 1], [1, 1, 0], [0, 1], []]);
    await move(0, 1);
    expect(rodText(1)).toBe('*1,1,0');
    await fireEvent.press(screen.getByTestId('rod-1'));
    expect(rodText(1)).toBe('1,1,0');
  });

  it('tells screen reader users about picking up, putting back and taps that cannot move', async () => {
    await start([[0, 0, 1], [1, 1], [0], []]);
    const announce = jest.mocked(AccessibilityInfo.announceForAccessibility);
    await fireEvent.press(screen.getByTestId('rod-0'));
    expect(announce).toHaveBeenLastCalledWith('Picked up orange from rod 1');
    await fireEvent.press(screen.getByTestId('rod-0'));
    expect(announce).toHaveBeenLastCalledWith('Put orange back');
    await fireEvent.press(screen.getByTestId('rod-0'));
    await fireEvent.press(screen.getByTestId('rod-2'));
    expect(announce).toHaveBeenLastCalledWith("Can't move orange to rod 3. Picked up red instead");
  });

  it('says so when a tap on a full rod drops the selection', async () => {
    await start([[0, 0, 0, 0], [1, 1], [1, 1], []]);
    await fireEvent.press(screen.getByTestId('rod-1'));
    await fireEvent.press(screen.getByTestId('rod-0'));
    expect(AccessibilityInfo.announceForAccessibility).toHaveBeenLastCalledWith("Can't move orange to rod 1");
  });

  it('announces a dead end after the move that caused it', async () => {
    await start([[1, 2, 1], [2, 0, 0, 0], [2, 1, 0, 2], [1]]);
    await move(0, 3);
    expect(AccessibilityInfo.announceForAccessibilityWithOptions).toHaveBeenLastCalledWith(
      'No way to finish from here. Undo or restart.',
      { queue: true },
    );
  });

  it('drops the selection when a full rod is tapped instead of a target', async () => {
    await start([[0, 0, 0, 0], [1, 1], [1, 1], []]);
    await fireEvent.press(screen.getByTestId('rod-1'));
    expect(rodText(1)).toBe('*1,1');
    await fireEvent.press(screen.getByTestId('rod-0'));
    expect(rodText(1)).toBe('1,1');
    expect(rodText(0)).toBe('0,0,0,0');
  });

  it('undoes and restarts', async () => {
    await start([[0, 1], [1], [0, 0, 0, 1], [], [1]]);
    await move(0, 1);
    await move(4, 1);
    await fireEvent.press(screen.getByText('Undo'));
    expect(rodText(1)).toBe('1,1');
    expect(rodText(4)).toBe('1');
    await fireEvent.press(screen.getByText('Restart'));
    expect(rodText(0)).toBe('0,1');
    expect(screen.getByText('Moves 0')).toBeOnTheScreen();
  });

  it('reports a dead end', async () => {
    await start([[1, 0, 1, 0], [2, 0, 2, 0], [1, 2, 1, 2], []]);
    await move(2, 3);
    expect(screen.getByText('No way to finish from here. Undo or restart.')).toBeOnTheScreen();
  });

  it('reports a dead end even when a pointless move is still left', async () => {
    await start([[1, 2, 1], [2, 0, 0, 0], [2, 1, 0, 2], [1]]);
    expect(screen.queryByText('No way to finish from here. Undo or restart.')).toBeNull();
    await move(0, 3);
    expect(screen.getByText('No way to finish from here. Undo or restart.')).toBeOnTheScreen();
    await fireEvent.press(screen.getByText('Undo'));
    expect(screen.queryByText('No way to finish from here. Undo or restart.')).toBeNull();
  });

  describe('with a screen reader', () => {
    beforeEach(() => (mockScreenReader = true));
    afterEach(() => (mockScreenReader = false));

    it('describes each rod by color and plays through the rod buttons', async () => {
      await start([[0, 0, 0, 0], [], [1, 1], [1, 1]]);
      expect(await screen.findByRole('button', { name: 'Rod 1, complete, red' })).toBeOnTheScreen();
      expect(screen.getByRole('button', { name: 'Rod 2, empty' })).toBeOnTheScreen();
      const source = screen.getByRole('button', { name: 'Rod 4, orange, orange from the bottom, top 2 orange' });

      await fireEvent.press(source);
      await fireEvent.press(screen.getByRole('button', { name: 'Rod 2, empty' }));
      expect(AccessibilityInfo.announceForAccessibility).toHaveBeenCalledWith('Moved orange to rod 2');
      expect(screen.getByRole('button', { name: 'Rod 2, orange from the bottom, top 1 orange' })).toBeOnTheScreen();
      expect(screen.getByRole('button', { name: 'Rod 4, orange from the bottom, top 1 orange' })).toBeOnTheScreen();
    });
  });

  it('deals an earlier level picked from level select', async () => {
    await AsyncStorage.setItem('hoops.level', '5');
    await renderAsync(<HoopScreen onBack={jest.fn()} />);
    await screen.findByText('Level 5');
    await fireEvent.press(screen.getByRole('button', { name: 'Levels' }));
    expect(screen.getByRole('button', { name: 'Level 5' })).toBeSelected();
    expect(screen.queryByRole('button', { name: /^Level 6/ })).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: 'Level 2' }));
    expect(await screen.findByText('Level 2')).toBeOnTheScreen();
    logic.generateLevel(2).rods.forEach((rod, i) => expect(rodText(i)).toBe(rod.join(',')));
    expect(await AsyncStorage.getItem('hoops.furthest')).toBe('5');
  });

  describe('winning', () => {
    beforeEach(() => jest.useFakeTimers());

    it('praises a perfect solve and saves the next level', async () => {
      await start();
      for (const [from, to] of logic.generateLevel(1).solution) await move(from, to);
      await act(() => jest.advanceTimersByTime(650));
      expect(screen.getByText(/^Sorted in \d+ moves\.$/)).toBeOnTheScreen();
      expect(screen.queryByLabelText(/of 3 stars/)).toBeNull();
      expect(getStars('daily')).toEqual({});
      await fireEvent.press(screen.getByText('Next level'));
      expect(await screen.findByText('Level 2')).toBeOnTheScreen();
      expect(await AsyncStorage.getItem('hoops.level')).toBe('2');
    });

    it('saves the next level as soon as the level is won, even when leaving without Next', async () => {
      await start([[0, 0, 0, 0], [1, 1, 1], [1], []]);
      await move(2, 1);
      await act(() => jest.advanceTimersByTime(650));
      expect(screen.getByText('Sorted in 1 moves.')).toBeOnTheScreen();
      await fireEvent.press(screen.getByRole('button', { name: 'Levels' }));
      expect(screen.getByRole('button', { name: 'Level 2' })).toBeOnTheScreen();
      expect(await AsyncStorage.getItem('hoops.level')).toBe('2');
      expect(await AsyncStorage.getItem('hoops.furthest')).toBe('2');
      await screen.unmountAsync();
      await renderAsync(<HoopScreen onBack={jest.fn()} />);
      expect(await screen.findByText('Level 2')).toBeOnTheScreen();
    });

    it('prepares the next level while the win card shows and drops the finished one', async () => {
      await start([[0, 0, 0, 0], [1, 1, 1], [1], []]);
      expect(await AsyncStorage.getItem('hoops.deal.1')).not.toBeNull();
      await move(2, 1);
      expect(await AsyncStorage.getItem('hoops.deal.2')).toBeNull();
      await act(() => jest.advanceTimersByTime(650));
      await waitFor(async () => expect(await AsyncStorage.getItem('hoops.deal.2')).not.toBeNull());

      const generate = jest.spyOn(logic, 'levelTask');
      generate.mockClear();
      const stored = await AsyncStorage.getItem('hoops.deal.2');
      let answer: () => void = () => {};
      jest.mocked(AsyncStorage.getItem).mockImplementationOnce(() => new Promise((resolve) => (answer = () => resolve(stored))));
      await fireEvent.press(screen.getByText('Next level'));
      expect(screen.getByText('Level 2')).toBeOnTheScreen();
      expect(screen.queryByLabelText('Loading')).toBeNull();
      await act(async () => answer());
      expect(generate).not.toHaveBeenCalled();
      logic.generateLevel(2).rods.forEach((rod, i) => expect(rodText(i)).toBe(rod.join(',')));
      await waitFor(async () => expect(await AsyncStorage.getItem('hoops.deal.1')).toBeNull());
    });

    it('ignores taps between the winning pour and the win card', async () => {
      await start([[0, 0, 0, 0], [1, 1, 1], [1], []]);
      await move(2, 1);
      await fireEvent.press(screen.getByTestId('rod-1'));
      expect(rodText(1)).toBe('1,1,1,1');
      expect(screen.queryByText('Solved!')).toBeNull();
    });
  });
});
