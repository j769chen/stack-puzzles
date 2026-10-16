import { useSyncExternalStore } from 'react';
import { storedValue } from './storedValue';

export type Game = 'hanoi' | 'daily';
export type LevelStars = Record<number, number>;
type AllStars = Record<Game, LevelStars>;

export const MAX_STARS = 3;

const EMPTY: AllStars = { hanoi: {}, daily: {} };

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

function best(a: LevelStars, b: LevelStars): LevelStars {
  const better = Object.entries(b).filter(([level, stars]) => (a[Number(level)] ?? 0) < stars);
  return better.length ? { ...a, ...Object.fromEntries(better) } : a;
}

const store = storedValue('stars', parse);

export function getStars(game: Game): LevelStars {
  return store.get()[game];
}

export function loadStars() {
  return store.load();
}

export function recordStars(game: Game, level: number, stars: number) {
  const all = store.get();
  if ((all[game][level] ?? 0) >= stars) return;
  const next = { ...all, [game]: { ...all[game], [level]: stars } };
  store.update((saved) => ({ hanoi: best(saved.hanoi, next.hanoi), daily: best(saved.daily, next.daily) }));
}

export function useStars(game: Game): LevelStars {
  return useSyncExternalStore(store.subscribe, () => store.get()[game]);
}
