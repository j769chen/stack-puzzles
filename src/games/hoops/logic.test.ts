import { createHash } from 'crypto';
import {
  EMPTY_RODS,
  type Rods,
  canPour,
  generateLevel,
  hasAnyMove,
  isHoopsSolved,
  isRodComplete,
  levelSpec,
  pour,
  solveHoops,
  topRun,
} from './logic';

const CAP = 4;

function fewestMovesByBruteForce(start: Rods, cap: number) {
  const key = (rods: Rods) => rods.map((r) => r.join(',')).sort().join('|');
  const seen = new Set([key(start)]);
  let frontier = [start];
  for (let depth = 0; frontier.length; depth++) {
    if (frontier.some((rods) => isHoopsSolved(rods, cap))) return depth;
    const next: Rods[] = [];
    for (const rods of frontier)
      rods.forEach((_, from) =>
        rods.forEach((_, to) => {
          if (!canPour(rods, from, to, cap)) return;
          const after = pour(rods, from, to, cap);
          if (seen.has(key(after))) return;
          seen.add(key(after));
          next.push(after);
        }),
      );
    frontier = next;
  }
  return null;
}

function play(rods: Rods, path: [number, number][], cap: number) {
  for (const [from, to] of path) {
    expect(canPour(rods, from, to, cap)).toBe(true);
    rods = pour(rods, from, to, cap);
  }
  return rods;
}

describe('hoops logic', () => {
  it('counts the same-colored run on top of a rod', () => {
    expect(topRun([0, 1, 1])).toBe(2);
    expect(topRun([2])).toBe(1);
    expect(topRun([])).toBe(0);
  });

  it('pours onto an empty rod or a matching top with space', () => {
    const rods: Rods = [[0, 1], [1], [2, 2, 2, 1], []];
    expect(canPour(rods, 0, 1, CAP)).toBe(true);
    expect(canPour(rods, 0, 3, CAP)).toBe(true);
    expect(canPour(rods, 0, 2, CAP)).toBe(false);
    expect(canPour(rods, 3, 0, CAP)).toBe(false);
    expect(canPour(rods, 0, 0, CAP)).toBe(false);
  });

  it('pours the whole top run, limited by the space left', () => {
    expect(pour([[0, 1, 1, 1], [1, 1]], 0, 1, CAP)).toEqual([[0, 1], [1, 1, 1, 1]]);
    expect(pour([[0, 1, 1], []], 0, 1, CAP)).toEqual([[0], [1, 1]]);
  });

  it('pours without mutating the previous state', () => {
    const rods: Rods = [[0, 1], []];
    pour(rods, 0, 1, CAP);
    expect(rods).toEqual([[0, 1], []]);
  });

  it('treats a full single-color rod as complete', () => {
    expect(isRodComplete([1, 1, 1, 1], CAP)).toBe(true);
    expect(isRodComplete([1, 1, 1], CAP)).toBe(false);
    expect(isRodComplete([1, 1, 2, 1], CAP)).toBe(false);
  });

  it('is solved when every rod is empty or complete', () => {
    expect(isHoopsSolved([[0, 0, 0, 0], [], [1, 1, 1, 1]], CAP)).toBe(true);
    expect(isHoopsSolved([[0, 0, 0, 1], [], [1, 1, 1, 0]], CAP)).toBe(false);
  });

  it('detects when no pour is possible', () => {
    expect(hasAnyMove([[0, 1, 0, 1], [1, 0, 1, 0]], CAP)).toBe(false);
    expect(hasAnyMove([[0, 1, 0, 1], [1, 0, 1, 0], []], CAP)).toBe(true);
  });

  it.each([
    [1, 3, 4],
    [4, 4, 4],
    [22, 10, 4],
    [24, 10, 4],
    [25, 7, 5],
    [36, 10, 5],
    [37, 7, 6],
    [46, 10, 6],
    [1000, 10, 6],
  ])('level %i has %i colors on rods of %i', (level, colors, capacity) => {
    expect(levelSpec(level)).toEqual({ colors, capacity });
  });

  it('still deals the original rings for levels 1 to 24', () => {
    const levels = JSON.stringify(Array.from({ length: 24 }, (_, i) => generateLevel(i + 1)));
    expect(createHash('sha256').update(levels).digest('hex')).toBe(
      '8e537067a9c5ff305f0603144090f5252b520be722043c0488455801fe210ad4',
    );
  });

  it('deals the same rings for the same level', () => {
    expect(generateLevel(7)).toEqual(generateLevel(7));
  });

  it.each([1, 5, 12, 20, 30, 40, 50])('deals a fair, solvable level %i', (level) => {
    const rods = generateLevel(level);
    const { colors, capacity } = levelSpec(level);
    expect(rods).toHaveLength(colors + EMPTY_RODS);
    expect(rods.every((rod) => rod.length === 0 || rod.length === capacity)).toBe(true);
    expect(rods.some((rod) => isRodComplete(rod, capacity))).toBe(false);
    const counts = rods.flat().reduce<number[]>((acc, c) => ((acc[c] = (acc[c] ?? 0) + 1), acc), []);
    expect(counts).toEqual(Array(colors).fill(capacity));

    const path = solveHoops(rods, capacity);
    expect(path).not.toBeNull();
    expect(isHoopsSolved(play(rods, path!, capacity), capacity)).toBe(true);
  });

  it.each([1, 2, 4, 7, 10])('finds the shortest solution for level %i', (level) => {
    const rods = generateLevel(level);
    expect(solveHoops(rods, CAP)).toHaveLength(fewestMovesByBruteForce(rods, CAP)!);
  });

  it('returns null for a dead end', () => {
    expect(solveHoops([[0, 1, 0, 1], [1, 0, 1, 0]], CAP)).toBeNull();
  });
});
