import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect } from 'react';
import { EMPTY_RODS, type Rods } from '../hoops/logic';
import { loadOnce, useLoaded } from '../loading';
import { runInSlices } from '../task';
import { towerSpec, towerTask } from './logic';

const storageKey = (level: number) => `towersort.deal.${level}`;

function parseRods(stored: string | null, level: number): Rods | null {
  if (stored === null) return null;
  try {
    const rods: Rods = JSON.parse(stored);
    const { colors, sizes } = towerSpec(level);
    const rings = rods.flat().sort((a, b) => a - b);
    const fits = rods.length === colors + EMPTY_RODS && rings.length === colors * sizes && rings.every((ring, i) => ring === i);
    return fits ? rods : null;
  } catch {
    return null;
  }
}

export function loadTowerLevel(level: number): Promise<Rods> {
  const key = storageKey(level);
  return loadOnce(key, async () => {
    const stored = await AsyncStorage.getItem(key).catch(() => null);
    const cached = parseRods(stored, level);
    if (cached) return cached;
    const rods = await runInSlices(towerTask(level));
    AsyncStorage.setItem(key, JSON.stringify(rods)).catch(() => {});
    return rods;
  });
}

export function useTowerLevel(level: number | null): Rods | null {
  useEffect(() => {
    if (level !== null) AsyncStorage.removeItem(storageKey(level - 1)).catch(() => {});
  }, [level]);
  return useLoaded(level, loadTowerLevel);
}
