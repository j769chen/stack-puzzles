import { useCallback } from 'react';
import { type Game, useStars } from '../stars';
import { usePersistentNumber } from '../usePersistentNumber';

export function useProgress(game: Game, maxLevel = Infinity) {
  const [level, setLevel, levelLoaded] = usePersistentNumber(`${game}.level`, 1);
  const [furthest, setFurthest, furthestLoaded] = usePersistentNumber(`${game}.furthest`, 1);
  const stars = useStars(game);
  const solved = Object.keys(stars).map((solvedLevel) => Number(solvedLevel) + 1);
  const unlocked = Math.min(maxLevel, Math.max(level, furthest, ...solved));

  const goTo = useCallback(
    (next: number) => {
      setFurthest(Math.max(unlocked, next));
      setLevel(next);
    },
    [unlocked, setFurthest, setLevel],
  );

  return { level, unlocked, stars, goTo, loaded: levelLoaded && furthestLoaded };
}
