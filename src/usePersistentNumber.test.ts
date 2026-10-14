import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { usePersistentNumber } from './usePersistentNumber';

beforeEach(() => AsyncStorage.clear());

async function load(stored?: string) {
  if (stored !== undefined) await AsyncStorage.setItem('level', stored);
  const hook = await renderHook(() => usePersistentNumber('level', 1));
  await waitFor(() => expect(hook.result.current[2]).toBe(true));
  return hook;
}

describe('usePersistentNumber', () => {
  it('uses the initial value when nothing is stored', async () => {
    const { result } = await load();
    expect(result.current[0]).toBe(1);
  });

  it('reports not loaded before storage answers', async () => {
    let answer: (value: string | null) => void = () => {};
    jest.mocked(AsyncStorage.getItem).mockReturnValueOnce(new Promise((resolve) => (answer = resolve)));
    const { result } = await renderHook(() => usePersistentNumber('level', 1));
    expect(result.current[2]).toBe(false);
    await act(async () => answer('3'));
    expect(result.current).toEqual([3, expect.any(Function), true]);
  });

  it('loads a stored level', async () => {
    const { result } = await load('7');
    expect(result.current[0]).toBe(7);
  });

  it.each(['0', '-3', '2.5', 'abc', ''])('ignores the invalid stored value %p', async (stored) => {
    const { result } = await load(stored);
    expect(result.current[0]).toBe(1);
  });

  it('still finishes loading when storage fails', async () => {
    jest.mocked(AsyncStorage.getItem).mockRejectedValueOnce(new Error('disk'));
    const { result } = await load();
    expect(result.current[0]).toBe(1);
  });

  it('saves updates', async () => {
    const { result } = await load();
    await act(() => result.current[1](4));
    expect(result.current[0]).toBe(4);
    expect(await AsyncStorage.getItem('level')).toBe('4');
  });
});
