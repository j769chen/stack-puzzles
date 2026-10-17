import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, renderHook } from '@testing-library/react-native';
import { getStars, loadStars, recordStars, starsFor, totalStars, useStars } from './stars';

const flushStorage = () => new Promise((resolve) => setImmediate(resolve));

async function loadFrom(stored: string) {
  await AsyncStorage.setItem('stars', stored);
  await loadStars();
}

beforeEach(async () => {
  await AsyncStorage.clear();
  await loadStars();
});

describe('starsFor', () => {
  it.each([
    [7, 7, 3],
    [6, 7, 3],
    [8, 7, 2],
    [10, 7, 2],
    [11, 7, 1],
    [12, 8, 2],
    [13, 8, 1],
    [500, 7, 1],
  ])('gives %i moves against a minimum of %i %i stars', (moves, optimal, stars) => {
    expect(starsFor(moves, optimal)).toBe(stars);
  });
});

describe('totalStars', () => {
  it('adds up every level', () => {
    expect(totalStars({})).toBe(0);
    expect(totalStars({ 1: 3, 2: 1, 9: 2 })).toBe(6);
  });
});

describe('stars store', () => {
  it('starts empty', () => {
    expect(getStars('hanoi')).toEqual({});
    expect(getStars('daily')).toEqual({});
  });

  it('records stars per game and level and saves them', async () => {
    recordStars('hanoi', 2, 2);
    recordStars('daily', 40, 3);
    expect(getStars('hanoi')).toEqual({ 2: 2 });
    expect(getStars('daily')).toEqual({ 40: 3 });

    await flushStorage();
    await loadStars();
    expect(getStars('hanoi')).toEqual({ 2: 2 });
    expect(getStars('daily')).toEqual({ 40: 3 });
  });

  it('keeps the best result for a level', () => {
    recordStars('hanoi', 1, 2);
    recordStars('hanoi', 1, 1);
    expect(getStars('hanoi')).toEqual({ 1: 2 });
    recordStars('hanoi', 1, 3);
    expect(getStars('hanoi')).toEqual({ 1: 3 });
  });

  it('does not write to storage when nothing improves', async () => {
    recordStars('hanoi', 1, 3);
    await flushStorage();
    jest.mocked(AsyncStorage.setItem).mockClear();
    recordStars('hanoi', 1, 2);
    recordStars('hanoi', 1, 3);
    await flushStorage();
    expect(AsyncStorage.setItem).not.toHaveBeenCalled();
  });

  it('saves a win whose write failed when the level is won again', async () => {
    jest.mocked(AsyncStorage.setItem).mockRejectedValueOnce(new Error('disk full'));
    recordStars('daily', 20261017, 3);
    await flushStorage();
    expect(getStars('daily')).toEqual({ 20261017: 3 });
    recordStars('daily', 20261017, 3);
    await flushStorage();
    await loadStars();
    expect(getStars('daily')).toEqual({ 20261017: 3 });
  });

  it('keeps only valid levels and star counts from storage', async () => {
    await loadFrom(JSON.stringify({ hanoi: { 1: 3, 0: 3, 2.5: 2, x: 1, 3: 4, 4: '2', 5: 1 }, daily: 'none', other: { 1: 3 } }));
    expect(getStars('hanoi')).toEqual({ 1: 3, 5: 1 });
    expect(getStars('daily')).toEqual({});
  });

  it.each([
    ['corrupt JSON', '{hanoi:'],
    ['a number', '42'],
    ['null', 'null'],
  ])('starts empty for %s', async (_, stored) => {
    await loadFrom(JSON.stringify({ hanoi: { 1: 3 } }));
    await loadFrom(stored);
    expect(getStars('hanoi')).toEqual({});
  });

  it('keeps saved stars when storage cannot be read at launch', async () => {
    await AsyncStorage.setItem('stars', JSON.stringify({ hanoi: { 1: 3 }, daily: { 20261015: 2 } }));
    jest.mocked(AsyncStorage.getItem).mockRejectedValueOnce(new Error('disk'));
    await loadStars();
    recordStars('daily', 20261016, 1);
    await loadStars();
    expect(getStars('hanoi')).toEqual({ 1: 3 });
    expect(getStars('daily')).toEqual({ 20261015: 2, 20261016: 1 });
  });

  it('skips a save it cannot merge, then saves that win with the next one', async () => {
    await AsyncStorage.setItem('stars', JSON.stringify({ hanoi: { 1: 3 } }));
    jest.mocked(AsyncStorage.getItem).mockRejectedValueOnce(new Error('disk'));
    recordStars('daily', 20261015, 2);
    await flushStorage();
    expect(JSON.parse((await AsyncStorage.getItem('stars'))!)).toEqual({ hanoi: { 1: 3 } });
    recordStars('daily', 20261016, 3);
    await flushStorage();
    expect(JSON.parse((await AsyncStorage.getItem('stars'))!)).toEqual({
      hanoi: { 1: 3 },
      daily: { 20261015: 2, 20261016: 3 },
    });
  });

  it('keeps a win recorded before loading finishes', async () => {
    await AsyncStorage.setItem('stars', JSON.stringify({ hanoi: { 1: 3 } }));
    const loading = loadStars();
    recordStars('hanoi', 2, 2);
    await loading;
    await loadStars();
    expect(getStars('hanoi')).toEqual({ 1: 3, 2: 2 });
  });

  it('keeps stars saved for games it does not know about', async () => {
    await loadFrom(JSON.stringify({ hanoi: { 1: 3 }, towersort: { 4: 2 } }));
    recordStars('daily', 20261016, 2);
    await loadStars();
    expect(JSON.parse((await AsyncStorage.getItem('stars'))!)).toEqual({
      hanoi: { 1: 3 },
      daily: { 20261016: 2 },
      towersort: { 4: 2 },
    });
  });

  it('saves wins recorded in quick succession', async () => {
    recordStars('hanoi', 1, 3);
    recordStars('hanoi', 2, 1);
    recordStars('daily', 20261016, 2);
    await loadStars();
    expect(JSON.parse((await AsyncStorage.getItem('stars'))!)).toEqual({ hanoi: { 1: 3, 2: 1 }, daily: { 20261016: 2 } });
  });

  it('re-renders subscribers when stars change', async () => {
    const { result } = await renderHook(() => useStars('daily'));
    expect(result.current).toEqual({});
    await act(() => recordStars('daily', 3, 2));
    expect(result.current).toEqual({ 3: 2 });
  });
});
