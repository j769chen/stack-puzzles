import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { loadStars, recordStars } from '../stars';
import { useProgress } from './useProgress';

const flushStorage = () => new Promise((resolve) => setImmediate(resolve));

async function load(maxLevel?: number) {
  const hook = await renderHook(() => useProgress('hanoi', maxLevel));
  await waitFor(() => expect(hook.result.current.loaded).toBe(true));
  return hook;
}

beforeEach(async () => {
  await AsyncStorage.clear();
  await loadStars();
});

describe('useProgress', () => {
  it('starts at level 1 with only level 1 unlocked', async () => {
    const { result } = await load();
    expect(result.current.level).toBe(1);
    expect(result.current.unlocked).toBe(1);
  });

  it('treats the saved level as unlocked for players from before level select', async () => {
    await AsyncStorage.setItem('hanoi.level', '6');
    const { result } = await load();
    expect(result.current.unlocked).toBe(6);
  });

  it('unlocks the level after the highest one with stars', async () => {
    recordStars('hanoi', 4, 1);
    const { result } = await load();
    expect(result.current.unlocked).toBe(5);
    expect(result.current.stars).toEqual({ 4: 1 });
  });

  it('never unlocks past the last level', async () => {
    recordStars('hanoi', 8, 3);
    const { result } = await load(8);
    expect(result.current.unlocked).toBe(8);
  });

  it('keeps later levels unlocked after going back to an earlier one', async () => {
    await AsyncStorage.setItem('hanoi.level', '6');
    const { result } = await load();
    await act(() => result.current.goTo(2));
    expect(result.current.level).toBe(2);
    expect(result.current.unlocked).toBe(6);

    await flushStorage();
    const reloaded = await load();
    expect(reloaded.result.current.level).toBe(2);
    expect(reloaded.result.current.unlocked).toBe(6);
  });

  it('unlocks the level it moves to', async () => {
    const { result } = await load();
    await act(() => result.current.goTo(2));
    expect(result.current.unlocked).toBe(2);
    expect(await AsyncStorage.getItem('hanoi.furthest')).toBe('2');
  });
});
