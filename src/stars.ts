import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';

export type Game = 'hanoi' | 'daily';
export type LevelStars = Record<number, number>;
type AllStars = Record<Game, LevelStars>;

export const MAX_STARS = 3;

const STORAGE_KEY = 'stars';
const EMPTY: AllStars = { hanoi: {}, daily: {} };

let current = EMPTY;
const listeners = new Set<() => void>();

function publish(next: AllStars) {
  current = next;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function parseLevels(value: unknown): LevelStars {
  if (typeof value !== 'object' || value === null) return {};
  const entries = Object.entries(value).filter(
    ([level, stars]) => Number.isInteger(Number(level)) && Number(level) >= 1 && [1, 2, 3].includes(stars),
  );
  return Object.fromEntries(entries);
}

function parse(stored: string | null): AllStars {
  try {
    const value: unknown = JSON.parse(stored ?? '{}');
    if (typeof value !== 'object' || value === null) return EMPTY;
    const games = value as Partial<Record<Game, unknown>>;
    return { hanoi: parseLevels(games.hanoi), daily: parseLevels(games.daily) };
  } catch {
    return EMPTY;
  }
}

export function starsFor(moves: number, optimal: number): number {
  if (moves <= optimal) return 3;
  return moves <= optimal * 1.5 ? 2 : 1;
}

export function totalStars(levels: LevelStars): number {
  return Object.values(levels).reduce((sum, stars) => sum + stars, 0);
}

export function getStars(game: Game): LevelStars {
  return current[game];
}

export async function loadStars() {
  const stored = await AsyncStorage.getItem(STORAGE_KEY).catch(() => null);
  publish(parse(stored));
}

export function recordStars(game: Game, level: number, stars: number) {
  if ((current[game][level] ?? 0) >= stars) return;
  publish({ ...current, [game]: { ...current[game], [level]: stars } });
  AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(current)).catch(() => {});
}

export function useStars(game: Game): LevelStars {
  return useSyncExternalStore(subscribe, () => current[game]);
}
