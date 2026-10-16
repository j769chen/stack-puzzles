import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { type Deal, EMPTY_RODS, type LevelSpec, dailySpec, generateDaily, generateLevel, levelSpec } from './logic';

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

export async function loadDeal(level: number): Promise<Deal> {
  const stored = await AsyncStorage.getItem(storageKey(level)).catch(() => null);
  const cached = parseDeal(stored, levelSpec(level));
  if (cached) return cached;
  const deal = generateLevel(level);
  AsyncStorage.setItem(storageKey(level), JSON.stringify(deal)).catch(() => {});
  return deal;
}

export async function loadDailyDeal(key: number): Promise<Deal> {
  const stored = await AsyncStorage.getItem(DAILY_STORAGE_KEY).catch(() => null);
  const cached = parseDeal(stored, dailySpec(key), key);
  if (cached) return cached;
  const deal = generateDaily(key);
  AsyncStorage.setItem(DAILY_STORAGE_KEY, JSON.stringify({ key, ...deal })).catch(() => {});
  return deal;
}

function useLoadedDeal(id: number | null, load: (id: number) => Promise<Deal>): Deal | null {
  const [loaded, setLoaded] = useState<{ id: number; deal: Deal } | null>(null);

  useEffect(() => {
    if (id === null) return;
    let active = true;
    load(id).then((deal) => active && setLoaded({ id, deal }));
    return () => {
      active = false;
    };
  }, [id, load]);

  return loaded?.id === id ? loaded.deal : null;
}

export function useDeal(level: number | null): Deal | null {
  useEffect(() => {
    if (level !== null) AsyncStorage.removeItem(storageKey(level - 1)).catch(() => {});
  }, [level]);
  return useLoadedDeal(level, loadDeal);
}

export function useDailyDeal(key: number): Deal | null {
  return useLoadedDeal(key, loadDailyDeal);
}
