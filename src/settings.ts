import { useSyncExternalStore } from 'react';
import { storedValue } from './storedValue';

export type Settings = { sound: boolean; haptics: boolean; patterns: boolean };

const DEFAULTS: Settings = { sound: true, haptics: true, patterns: false };

function parse(stored: string | null): Settings {
  try {
    const value: unknown = JSON.parse(stored ?? '{}');
    if (typeof value !== 'object' || value === null) return DEFAULTS;
    const entries = Object.entries(value).filter(
      ([key, flag]) => key in DEFAULTS && typeof flag === 'boolean',
    );
    return { ...DEFAULTS, ...Object.fromEntries(entries) };
  } catch {
    return DEFAULTS;
  }
}

const store = storedValue('settings', parse);

export const getSettings = store.get;

export function loadSettings() {
  return store.load();
}

export function updateSettings(change: Partial<Settings>) {
  store.update((settings) => ({ ...settings, ...change }));
}

export function useSettings(): Settings {
  return useSyncExternalStore(store.subscribe, store.get);
}
