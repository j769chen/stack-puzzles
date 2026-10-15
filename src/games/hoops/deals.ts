import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { type Deal, EMPTY_RODS, generateLevel, levelSpec } from './logic';

const storageKey = (level: number) => `hoops.deal.${level}`;

function parseDeal(stored: string | null, level: number): Deal | null {
  if (stored === null) return null;
  try {
    const deal: Deal = JSON.parse(stored);
    const { colors, capacity } = levelSpec(level);
    const fits =
      deal.rods.length === colors + EMPTY_RODS &&
      deal.rods.flat().length === colors * capacity &&
      deal.rods.every((rod) => rod.length <= capacity) &&
      deal.solution.length > 0;
    return fits ? deal : null;
  } catch {
    return null;
  }
}

export async function loadDeal(level: number): Promise<Deal> {
  const stored = await AsyncStorage.getItem(storageKey(level)).catch(() => null);
  const cached = parseDeal(stored, level);
  if (cached) return cached;
  const deal = generateLevel(level);
  AsyncStorage.setItem(storageKey(level), JSON.stringify(deal)).catch(() => {});
  return deal;
}

export function useDeal(level: number | null): Deal | null {
  const [loaded, setLoaded] = useState<{ level: number; deal: Deal } | null>(null);

  useEffect(() => {
    if (level === null) return;
    let active = true;
    loadDeal(level).then((deal) => active && setLoaded({ level, deal }));
    AsyncStorage.removeItem(storageKey(level - 1)).catch(() => {});
    return () => {
      active = false;
    };
  }, [level]);

  return loaded?.level === level ? loaded.deal : null;
}
