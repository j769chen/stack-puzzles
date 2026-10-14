import { act, renderHook } from '@testing-library/react-native';
import { useHistory } from './useHistory';

describe('useHistory', () => {
  it('starts with the initial entry and no moves', async () => {
    const { result } = await renderHook(() => useHistory(() => 'start'));
    expect(result.current.current).toBe('start');
    expect(result.current.moves).toBe(0);
  });

  it('pushes, undoes and restarts', async () => {
    const { result } = await renderHook(() => useHistory(() => 0));
    await act(() => result.current.push(1));
    await act(() => result.current.push(2));
    expect(result.current.current).toBe(2);
    expect(result.current.moves).toBe(2);

    await act(() => result.current.undo());
    expect(result.current.current).toBe(1);
    expect(result.current.moves).toBe(1);

    await act(() => result.current.restart());
    expect(result.current.current).toBe(0);
    expect(result.current.moves).toBe(0);
  });

  it('ignores undo at the start', async () => {
    const { result } = await renderHook(() => useHistory(() => 'start'));
    await act(() => result.current.undo());
    expect(result.current.current).toBe('start');
  });

  it('only builds the initial entry once', async () => {
    const init = jest.fn(() => 0);
    const { result } = await renderHook(() => useHistory(init));
    await act(() => result.current.push(1));
    expect(init).toHaveBeenCalledTimes(1);
  });
});
