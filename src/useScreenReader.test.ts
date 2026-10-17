import { act, renderHookAsync } from '@testing-library/react-native';
import { AccessibilityInfo } from 'react-native';
import { useScreenReader } from './useScreenReader';

type Listener = (on: boolean) => void;

function changeListener() {
  const listen: (event: 'screenReaderChanged', handler: Listener) => unknown = AccessibilityInfo.addEventListener;
  const [, notify] = jest.mocked(listen).mock.calls.find(([event]) => event === 'screenReaderChanged')!;
  return notify;
}

afterEach(() => jest.restoreAllMocks());

describe('useScreenReader', () => {
  it('reports whether a screen reader is running', async () => {
    jest.spyOn(AccessibilityInfo, 'isScreenReaderEnabled').mockResolvedValue(true);
    const { result } = await renderHookAsync(() => useScreenReader());
    expect(result.current).toBe(true);
  });

  it('keeps a change that arrives before the first answer', async () => {
    let answer: (on: boolean) => void = () => {};
    jest.spyOn(AccessibilityInfo, 'isScreenReaderEnabled').mockReturnValue(new Promise((resolve) => (answer = resolve)));
    const { result } = await renderHookAsync(() => useScreenReader());
    await act(async () => changeListener()(true));
    await act(async () => answer(false));
    expect(result.current).toBe(true);
  });

  it('stays off when the first answer fails', async () => {
    jest.spyOn(AccessibilityInfo, 'isScreenReaderEnabled').mockRejectedValue(new Error('unavailable'));
    const { result } = await renderHookAsync(() => useScreenReader());
    await act(async () => {});
    expect(result.current).toBe(false);
  });
});
