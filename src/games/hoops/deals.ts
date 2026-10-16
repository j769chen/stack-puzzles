import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect } from 'react';
import { loadOnce, useLoaded } from '../loading';
import { runInSlices } from '../task';
import { type Deal, EMPTY_RODS, type LevelSpec, dailySpec, dailyTask, levelSpec, levelTask } from './logic';

const storageKey = (level: number) => `hoops.deal.${level}`;
const DAILY_STORAGE_KEY = 'daily.deal';

function parseDeal(stored: string | null, spec: LevelSpec, dailyKey?: number): Deal | null {
  if (stored === null) return null;
  try {
    const deal: Deal & { key?: number } = JSON.parse(stored);
    const { colors, capacity } = spec;
    const fits =
      deal.key === dailyKey &&
      deal.rods.length === colors + EMPTY_RODS &&
      deal.rods.flat().length === colors * capacity &&
      deal.rods.every((rod) => rod.length <= capacity) &&
      deal.solution.length > 0;
    return fits ? { rods: deal.rods, solution: deal.solution } : null;
  } catch {
    return null;
  }
}

export function loadDeal(level: number): Promise<Deal> {
  const key = storageKey(level);
  return loadOnce(key, async () => {
    const stored = await AsyncStorage.getItem(key).catch(() => null);
    const cached = parseDeal(stored, levelSpec(level));
    if (cached) return cached;
    const deal = await runInSlices(levelTask(level));
    AsyncStorage.setItem(key, JSON.stringify(deal)).catch(() => {});
    return deal;
  });
}

export function loadDailyDeal(key: number): Promise<Deal> {
  return loadOnce(`${DAILY_STORAGE_KEY}.${key}`, async () => {
    const stored = await AsyncStorage.getItem(DAILY_STORAGE_KEY).catch(() => null);
    const cached = parseDeal(stored, dailySpec(key), key);
    if (cached) return cached;
    const deal = await runInSlices(dailyTask(key));
    AsyncStorage.setItem(DAILY_STORAGE_KEY, JSON.stringify({ key, ...deal })).catch(() => {});
    return deal;
  });
}

export function useDeal(level: number | null): Deal | null {
  useEffect(() => {
    if (level !== null) AsyncStorage.removeItem(storageKey(level - 1)).catch(() => {});
  }, [level]);
  return useLoaded(level, loadDeal);
}

export function useDailyDeal(key: number): Deal | null {
  return useLoaded(key, loadDailyDeal);
}
