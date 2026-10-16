import { useCallback } from 'react';
import type { LevelStars } from '../stars';
import { usePersistentNumber } from '../usePersistentNumber';

const NO_STARS: LevelStars = {};

export function useProgress(game: string, maxLevel = Infinity, stars = NO_STARS) {
  const [level, setLevel, levelLoaded] = usePersistentNumber(`${game}.level`, 1);
  const [furthest, setFurthest, furthestLoaded] = usePersistentNumber(`${game}.furthest`, 1);
  const solved = Object.keys(stars).map((solvedLevel) => Number(solvedLevel) + 1);
  const unlocked = Math.min(maxLevel, Math.max(level, furthest, ...solved));

  const goTo = useCallback(
    (next: number) => {
      setFurthest(Math.max(unlocked, next));
      setLevel(next);
    },
    [unlocked, setFurthest, setLevel],
  );

  return { level, unlocked, goTo, loaded: levelLoaded && furthestLoaded };
}
