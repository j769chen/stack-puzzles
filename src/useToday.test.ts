import { act, renderHook } from '@testing-library/react-native';
import { AppState, type AppStateStatus } from 'react-native';
import { useToday } from './useToday';

function appStateListener() {
  const [, listener] = jest.mocked(AppState.addEventListener).mock.calls.at(-1)!;
  return listener as (state: AppStateStatus) => void;
}

beforeEach(() => jest.useFakeTimers({ now: new Date(2026, 9, 16, 23, 50) }));
afterEach(() => jest.useRealTimers());

describe('useToday', () => {
  it("starts on today's date", async () => {
    const { result } = await renderHook(() => useToday());
    expect(result.current).toBe(20261016);
  });

  it('moves to the new day when the app comes back to the foreground', async () => {
    const { result } = await renderHook(() => useToday());
    jest.setSystemTime(new Date(2026, 9, 17, 7, 30));
    await act(() => appStateListener()('background'));
    expect(result.current).toBe(20261016);
    await act(() => appStateListener()('active'));
    expect(result.current).toBe(20261017);
  });

  it('stops listening once unmounted', async () => {
    const { unmount } = await renderHook(() => useToday());
    const subscription = jest.mocked(AppState.addEventListener).mock.results.at(-1)!.value as { remove: jest.Mock };
    await unmount();
    expect(subscription.remove).toHaveBeenCalledTimes(1);
  });
});
