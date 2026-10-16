import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';

export type Settings = { sound: boolean; haptics: boolean; patterns: boolean };

const STORAGE_KEY = 'settings';
const DEFAULTS: Settings = { sound: true, haptics: true, patterns: false };

let current = DEFAULTS;
const listeners = new Set<() => void>();

function publish(next: Settings) {
  current = next;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function parse(stored: string | null): Partial<Settings> {
  try {
    const value: unknown = JSON.parse(stored ?? '{}');
    if (typeof value !== 'object' || value === null) return {};
    const entries = Object.entries(value).filter(
      ([key, flag]) => key in DEFAULTS && typeof flag === 'boolean',
    );
    return Object.fromEntries(entries);
  } catch {
    return {};
  }
}

export function getSettings(): Settings {
  return current;
}

export async function loadSettings() {
  const stored = await AsyncStorage.getItem(STORAGE_KEY).catch(() => null);
  publish({ ...DEFAULTS, ...parse(stored) });
}

export function updateSettings(change: Partial<Settings>) {
  publish({ ...current, ...change });
  AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(current)).catch(() => {});
}

export function useSettings(): Settings {
  return useSyncExternalStore(subscribe, getSettings);
}
