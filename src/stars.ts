import { useSyncExternalStore } from 'react';
import { storedValue } from './storedValue';

const GAMES = ['hanoi', 'daily'] as const;
export type Game = (typeof GAMES)[number];
export type LevelStars = Record<number, number>;
type AllStars = Record<string, unknown> & Record<Game, LevelStars>;

export const MAX_STARS = 3;

const eachGame = (stars: (game: Game) => LevelStars) =>
  Object.fromEntries(GAMES.map((game) => [game, stars(game)])) as Record<Game, LevelStars>;

function parseLevels(value: unknown): LevelStars {
  if (typeof value !== 'object' || value === null) return {};
  const entries = Object.entries(value).filter(
    ([level, stars]) => Number.isInteger(Number(level)) && Number(level) >= 1 && [1, 2, 3].includes(stars),
  );
  return Object.fromEntries(entries);
}

function parse(stored: string | null): AllStars {
  let saved: Record<string, unknown> = {};
  try {
    const value: unknown = JSON.parse(stored ?? '{}');
    if (typeof value === 'object' && value !== null) saved = value as Record<string, unknown>;
  } catch {}
  return { ...saved, ...eachGame((game) => parseLevels(saved[game])) };
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
  store.update((saved) => ({ ...saved, [game]: best(saved[game], { [level]: stars }) }));
}

export function useStars(game: Game): LevelStars {
  return useSyncExternalStore(store.subscribe, () => store.get()[game]);
}
