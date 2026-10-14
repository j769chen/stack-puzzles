import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, renderHook } from '@testing-library/react-native';
import { getSettings, loadSettings, updateSettings, useSettings } from './settings';

async function loadFrom(stored?: string) {
  if (stored !== undefined) await AsyncStorage.setItem('settings', stored);
  await loadSettings();
}

const flushStorage = () => new Promise((resolve) => setImmediate(resolve));

beforeEach(async () => {
  await AsyncStorage.clear();
  await loadSettings();
});

describe('settings', () => {
  it('has sound and haptics on before anything loads', () => {
    jest.isolateModules(() => {
      const fresh = jest.requireActual<typeof import('./settings')>('./settings');
      expect(fresh.getSettings()).toEqual({ sound: true, haptics: true });
    });
  });

  it('keeps sound and haptics on when nothing was saved', async () => {
    await loadFrom();
    expect(getSettings()).toEqual({ sound: true, haptics: true });
  });

  it('loads saved choices', async () => {
    await loadFrom(JSON.stringify({ sound: false, haptics: true }));
    expect(getSettings()).toEqual({ sound: false, haptics: true });
  });

  it('keeps defaults for anything missing from what was saved', async () => {
    await loadFrom(JSON.stringify({ haptics: false }));
    expect(getSettings()).toEqual({ sound: true, haptics: false });
  });

  it.each([
    ['corrupt JSON', '{sound:'],
    ['a number', '42'],
    ['null', 'null'],
    ['wrong types', JSON.stringify({ sound: 'off', haptics: 0 })],
  ])('falls back to defaults for %s', async (_, stored) => {
    await loadFrom(stored);
    expect(getSettings()).toEqual({ sound: true, haptics: true });
  });

  it('ignores keys it does not know', async () => {
    await loadFrom(JSON.stringify({ sound: false, volume: 3 }));
    expect(getSettings()).toEqual({ sound: false, haptics: true });
  });

  it('falls back to defaults when storage cannot be read', async () => {
    updateSettings({ sound: false });
    jest.mocked(AsyncStorage.getItem).mockRejectedValueOnce(new Error('disk'));
    await loadSettings();
    expect(getSettings()).toEqual({ sound: true, haptics: true });
  });

  it('saves changes so they survive a reload', async () => {
    updateSettings({ sound: false });
    expect(getSettings()).toEqual({ sound: false, haptics: true });
    await flushStorage();
    expect(JSON.parse((await AsyncStorage.getItem('settings'))!)).toEqual({ sound: false, haptics: true });

    await loadSettings();
    expect(getSettings()).toEqual({ sound: false, haptics: true });
  });

  it('re-renders subscribers after loading and on change', async () => {
    await AsyncStorage.setItem('settings', JSON.stringify({ haptics: false }));
    const { result } = await renderHook(() => useSettings());
    expect(result.current.haptics).toBe(true);

    await act(() => loadSettings());
    expect(result.current.haptics).toBe(false);

    await act(() => updateSettings({ haptics: true }));
    expect(result.current.haptics).toBe(true);
  });
});
