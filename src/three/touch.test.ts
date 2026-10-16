import { act, renderHook } from '@testing-library/react-native';
import { useTouchCancelled } from './touch';

describe('useTouchCancelled', () => {
  it('marks a touch as cancelled until the next one starts', async () => {
    const { result, rerender } = await renderHook(() => useTouchCancelled());
    const first = result.current;
    expect(first.cancelled.current).toBe(false);
    await act(() => first.onTouchCancel());
    expect(first.cancelled.current).toBe(true);
    await act(() => first.onTouchStart());
    expect(first.cancelled.current).toBe(false);
    await rerender({});
    expect(result.current).toBe(first);
  });
});
