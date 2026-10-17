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
      expect(fresh.getSettings()).toEqual({ sound: true, haptics: true, patterns: false });
    });
  });

  it('keeps sound and haptics on when nothing was saved', async () => {
    await loadFrom();
    expect(getSettings()).toEqual({ sound: true, haptics: true, patterns: false });
  });

  it('loads saved choices', async () => {
    await loadFrom(JSON.stringify({ sound: false, haptics: true }));
    expect(getSettings()).toEqual({ sound: false, haptics: true, patterns: false });
  });

  it('keeps defaults for anything missing from what was saved', async () => {
    await loadFrom(JSON.stringify({ haptics: false }));
    expect(getSettings()).toEqual({ sound: true, haptics: false, patterns: false });
  });

  it.each([
    ['corrupt JSON', '{sound:'],
    ['a number', '42'],
    ['null', 'null'],
    ['wrong types', JSON.stringify({ sound: 'off', haptics: 0 })],
  ])('falls back to defaults for %s', async (_, stored) => {
    await loadFrom(stored);
    expect(getSettings()).toEqual({ sound: true, haptics: true, patterns: false });
  });

  it('ignores keys it does not know', async () => {
    await loadFrom(JSON.stringify({ sound: false, volume: 3 }));
    expect(getSettings()).toEqual({ sound: false, haptics: true, patterns: false });
  });

  it('keeps saved choices when storage cannot be read at launch', async () => {
    await AsyncStorage.setItem('settings', JSON.stringify({ sound: false, haptics: false, patterns: true }));
    jest.mocked(AsyncStorage.getItem).mockRejectedValueOnce(new Error('disk'));
    await loadSettings();
    expect(getSettings()).toEqual({ sound: true, haptics: true, patterns: false });
    updateSettings({ patterns: false });
    await loadSettings();
    expect(getSettings()).toEqual({ sound: false, haptics: false, patterns: false });
    expect(JSON.parse((await AsyncStorage.getItem('settings'))!)).toEqual({ sound: false, haptics: false, patterns: false });
  });

  it('skips a save it cannot merge with what is stored, then saves that change with the next one', async () => {
    await AsyncStorage.setItem('settings', JSON.stringify({ sound: false }));
    jest.mocked(AsyncStorage.getItem).mockRejectedValueOnce(new Error('disk'));
    updateSettings({ haptics: false });
    expect(getSettings().haptics).toBe(false);
    await flushStorage();
    expect(JSON.parse((await AsyncStorage.getItem('settings'))!)).toEqual({ sound: false });
    updateSettings({ patterns: true });
    await flushStorage();
    expect(getSettings()).toEqual({ sound: false, haptics: false, patterns: true });
    expect(JSON.parse((await AsyncStorage.getItem('settings'))!)).toEqual({ sound: false, haptics: false, patterns: true });
  });

  it('keeps a change whose write failed and saves it with the next one', async () => {
    jest.mocked(AsyncStorage.setItem).mockRejectedValueOnce(new Error('disk full'));
    updateSettings({ sound: false });
    await flushStorage();
    expect(getSettings().sound).toBe(false);
    updateSettings({ patterns: true });
    await flushStorage();
    expect(getSettings()).toEqual({ sound: false, haptics: true, patterns: true });
    expect(JSON.parse((await AsyncStorage.getItem('settings'))!)).toEqual({ sound: false, haptics: true, patterns: true });
  });

  it('keeps a change made before loading finishes', async () => {
    await AsyncStorage.setItem('settings', JSON.stringify({ sound: false }));
    const loading = loadSettings();
    updateSettings({ haptics: false });
    await loading;
    expect(getSettings()).toEqual({ sound: true, haptics: false, patterns: false });
    await loadSettings();
    expect(getSettings()).toEqual({ sound: false, haptics: false, patterns: false });
  });

  it('saves changes made in quick succession', async () => {
    updateSettings({ sound: false });
    updateSettings({ haptics: false });
    updateSettings({ patterns: true });
    expect(getSettings()).toEqual({ sound: false, haptics: false, patterns: true });
    await loadSettings();
    expect(getSettings()).toEqual({ sound: false, haptics: false, patterns: true });
  });

  it('saves changes so they survive a reload', async () => {
    updateSettings({ sound: false });
    expect(getSettings()).toEqual({ sound: false, haptics: true, patterns: false });
    await flushStorage();
    expect(JSON.parse((await AsyncStorage.getItem('settings'))!)).toEqual({ sound: false, haptics: true, patterns: false });

    await loadSettings();
    expect(getSettings()).toEqual({ sound: false, haptics: true, patterns: false });
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
