import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, renderHook } from '@testing-library/react-native';
import { dealCache } from './dealCache';
import type { Task } from './task';

function* returns<T>(value: T): Task<T> {
  return value;
}

function* fails(): Task<number> {
  throw new Error('No deal found');
}

const cache = (task: (id: number) => Task<number>) =>
  dealCache<number>({ prefix: 'test.deal', task, fits: (stored, id) => stored === id * 10 });

beforeEach(() => AsyncStorage.clear());

describe('dealCache', () => {
  it('shares one load between callers until it settles, then reads it back from storage', async () => {
    const task = jest.fn((id: number) => returns(id * 10));
    const deals = cache(task);
    const first = deals.load(3);
    expect(deals.load(3)).toBe(first);
    await expect(first).resolves.toBe(30);
    await expect(deals.load(3)).resolves.toBe(30);
    expect(task).toHaveBeenCalledTimes(1);
  });

  it('hands a failed load to the screen to throw', async () => {
    const deals = cache(fails);
    const { result } = await renderHook(() => {
      try {
        return deals.useDeal(1);
      } catch (error) {
        return error;
      }
    });
    await act(async () => {});
    expect(result.current).toEqual(new Error('No deal found'));
  });

  it('ignores a failure while preparing ahead', async () => {
    const deals = cache((id) => (id === 2 ? fails() : returns(id * 10)));
    const { result } = await renderHook(() => deals.useDeal(1));
    await act(async () => {});
    await act(async () => result.current.prepare(2));
    expect(result.current.deal).toBe(10);
  });
});
