import {
  CAPACITY,
  EMPTY_RODS,
  type Rods,
  canPour,
  colorsForLevel,
  generateLevel,
  hasAnyMove,
  isHoopsSolved,
  isRodComplete,
  pour,
  solveHoops,
  topRun,
} from './logic';

function fewestMovesByBruteForce(start: Rods) {
  const key = (rods: Rods) => rods.map((r) => r.join(',')).sort().join('|');
  const seen = new Set([key(start)]);
  let frontier = [start];
  for (let depth = 0; frontier.length; depth++) {
    if (frontier.some((rods) => isHoopsSolved(rods))) return depth;
    const next: Rods[] = [];
    for (const rods of frontier)
      rods.forEach((_, from) =>
        rods.forEach((_, to) => {
          if (!canPour(rods, from, to)) return;
          const after = pour(rods, from, to);
          if (seen.has(key(after))) return;
          seen.add(key(after));
          next.push(after);
        }),
      );
    frontier = next;
  }
  return null;
}

function play(rods: Rods, path: [number, number][]) {
  for (const [from, to] of path) {
    expect(canPour(rods, from, to)).toBe(true);
    rods = pour(rods, from, to);
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
    expect(canPour(rods, 0, 1)).toBe(true);
    expect(canPour(rods, 0, 3)).toBe(true);
    expect(canPour(rods, 0, 2)).toBe(false);
    expect(canPour(rods, 3, 0)).toBe(false);
    expect(canPour(rods, 0, 0)).toBe(false);
  });

  it('pours the whole top run, limited by the space left', () => {
    expect(pour([[0, 1, 1, 1], [1, 1]], 0, 1)).toEqual([[0, 1], [1, 1, 1, 1]]);
    expect(pour([[0, 1, 1], []], 0, 1)).toEqual([[0], [1, 1]]);
  });

  it('pours without mutating the previous state', () => {
    const rods: Rods = [[0, 1], []];
    pour(rods, 0, 1);
    expect(rods).toEqual([[0, 1], []]);
  });

  it('treats a full single-color rod as complete', () => {
    expect(isRodComplete([1, 1, 1, 1])).toBe(true);
    expect(isRodComplete([1, 1, 1])).toBe(false);
    expect(isRodComplete([1, 1, 2, 1])).toBe(false);
  });

  it('is solved when every rod is empty or complete', () => {
    expect(isHoopsSolved([[0, 0, 0, 0], [], [1, 1, 1, 1]])).toBe(true);
    expect(isHoopsSolved([[0, 0, 0, 1], [], [1, 1, 1, 0]])).toBe(false);
  });

  it('detects when no pour is possible', () => {
    expect(hasAnyMove([[0, 1, 0, 1], [1, 0, 1, 0]])).toBe(false);
    expect(hasAnyMove([[0, 1, 0, 1], [1, 0, 1, 0], []])).toBe(true);
  });

  it('ramps colors from 3 up to the cap', () => {
    expect(colorsForLevel(1)).toBe(3);
    expect(colorsForLevel(4)).toBe(4);
    expect(colorsForLevel(1000)).toBe(10);
  });

  it('deals the same rings for the same level', () => {
    expect(generateLevel(7)).toEqual(generateLevel(7));
  });

  it.each([1, 5, 12, 20, 30, 45])('deals a fair, solvable level %i', (level) => {
    const rods = generateLevel(level);
    const colors = colorsForLevel(level);
    expect(rods).toHaveLength(colors + EMPTY_RODS);
    expect(rods.some((rod) => isRodComplete(rod))).toBe(false);
    const counts = rods.flat().reduce<number[]>((acc, c) => ((acc[c] = (acc[c] ?? 0) + 1), acc), []);
    expect(counts).toEqual(Array(colors).fill(CAPACITY));

    const path = solveHoops(rods);
    expect(path).not.toBeNull();
    expect(isHoopsSolved(play(rods, path!))).toBe(true);
  });

  it.each([1, 2, 4, 7, 10])('finds the shortest solution for level %i', (level) => {
    const rods = generateLevel(level);
    expect(solveHoops(rods)).toHaveLength(fewestMovesByBruteForce(rods)!);
  });

  it('returns null for a dead end', () => {
    expect(solveHoops([[0, 1, 0, 1], [1, 0, 1, 0]])).toBeNull();
  });
});
