import { createHash } from 'crypto';
import {
  EMPTY_RODS,
  MAX_COLORS,
  type Rods,
  canPour,
  dailySpec,
  generateDaily,
  generateLevel,
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

function play(rods: Rods, path: [number, number][], cap: number) {
  for (const [from, to] of path) {
    expect(canPour(rods, from, to, cap)).toBe(true);
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
    expect(canPour(rods, 0, 1, CAP)).toBe(true);
    expect(canPour(rods, 0, 3, CAP)).toBe(true);
    expect(canPour(rods, 0, 2, CAP)).toBe(false);
    expect(canPour(rods, 3, 0, CAP)).toBe(false);
    expect(canPour(rods, 0, 0, CAP)).toBe(false);
  });

  it('moves only the top ring, even when rings below it share its color', () => {
    expect(pour([[0, 1, 1, 1], [1, 1]], 0, 1)).toEqual([[0, 1, 1], [1, 1, 1]]);
    expect(pour([[0, 1, 1], []], 0, 1)).toEqual([[0, 1], [1]]);
  });

  it('pours without mutating the previous state', () => {
    const rods: Rods = [[0, 1], []];
    pour(rods, 0, 1);
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
    const levels = JSON.stringify(Array.from({ length: 24 }, (_, i) => generateLevel(i + 1).rods));
    expect(createHash('sha256').update(levels).digest('hex')).toBe(
      '8e537067a9c5ff305f0603144090f5252b520be722043c0488455801fe210ad4',
    );
  });

  it('still deals the original rings for later levels', () => {
    const levels = JSON.stringify([25, 36, 37, 60, 78, 100].map((level) => generateLevel(level).rods));
    expect(createHash('sha256').update(levels).digest('hex')).toBe(
      'c5ccbf74e5b1dec203e596aa2646afdafe502836ddcd68719fd493616ffac5a7',
    );
  });

  it('deals the same rings for the same level', () => {
    expect(generateLevel(7)).toEqual(generateLevel(7));
  });

  it.each([1, 5, 12, 20, 30, 40, 50])('deals a fair, solvable level %i', (level) => {
    const { rods, solution } = generateLevel(level);
    const { colors, capacity } = levelSpec(level);
    expect(rods).toHaveLength(colors + EMPTY_RODS);
    expect(rods.every((rod) => rod.length === 0 || rod.length === capacity)).toBe(true);
    expect(rods.some((rod) => isRodComplete(rod, capacity))).toBe(false);
    const counts = rods.flat().reduce<number[]>((acc, c) => ((acc[c] = (acc[c] ?? 0) + 1), acc), []);
    expect(counts).toEqual(Array(colors).fill(capacity));

    expect(isHoopsSolved(play(rods, solution, capacity), capacity)).toBe(true);
  });

  it.each([1, 2, 4, 7, 10])('records the shortest solution for level %i', (level) => {
    const { rods, solution } = generateLevel(level);
    expect(solution).toHaveLength(fewestMovesByBruteForce(rods, CAP)!);
  });

  it.each([
    [3, 5],
    [4, 5],
    [3, 6],
    [4, 6],
  ])('finds the shortest solution with %i colors on rods of %i', (colors, capacity) => {
    const rand = seededRandom(colors * 10 + capacity);
    for (let n = 0; n < 6; n++) {
      const rods = shuffledRods(colors, capacity, rand);
      expect(solveHoops(rods, capacity)?.length ?? null).toBe(fewestMovesByBruteForce(rods, capacity));
    }
  });

  it('returns null for a dead end', () => {
    expect(solveHoops([[0, 1, 0, 1], [1, 0, 1, 0]], CAP)).toBeNull();
  });
});

function seededRandom(seed: number) {
  let state = seed;
  return () => {
    state = (Math.imul(state, 1103515245) + 12345) >>> 0;
    return state / 2 ** 32;
  };
}

function legalPours(rods: Rods, cap: number): [number, number][] {
  const pours: [number, number][] = [];
  rods.forEach((_, from) => rods.forEach((_, to) => canPour(rods, from, to, cap) && pours.push([from, to])));
  return pours;
}

function randomWalk(start: Rods, cap: number, steps: number, rand: () => number) {
  const states = [start];
  let rods = start;
  for (let i = 0; i < steps; i++) {
    const pours = legalPours(rods, cap);
    if (pours.length === 0) break;
    rods = pour(rods, ...pours[Math.floor(rand() * pours.length)]);
    states.push(rods);
  }
  return states;
}

function shuffledRods(colors: number, cap: number, rand: () => number): Rods {
  const rings = Array.from({ length: colors * cap }, (_, i) => Math.floor(i / cap));
  for (let i = rings.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [rings[i], rings[j]] = [rings[j], rings[i]];
  }
  return [...Array.from({ length: colors }, (_, i) => rings.slice(i * cap, (i + 1) * cap)), [], []];
}

const sortedRings = (rods: Rods) => rods.flat().sort((a, b) => a - b);

describe('hoops rules under random play', () => {
  const levels = [3, 18, 27, 40];
  const walks = levels.flatMap((level) => {
    const { capacity } = levelSpec(level);
    const rand = seededRandom(level);
    return Array.from({ length: 15 }, () => ({ capacity, states: randomWalk(generateLevel(level).rods, capacity, 40, rand) }));
  });
  const positions = walks.flatMap(({ capacity, states }) => states.map((rods) => ({ capacity, rods })));

  it('visits enough positions to mean something', () => {
    expect(positions.length).toBeGreaterThan(1500);
  });

  it('allows a pour exactly when the source has rings and the target has room and a matching top', () => {
    const wrong: string[] = [];
    for (const { capacity, rods } of positions)
      rods.forEach((src, from) =>
        rods.forEach((dst, to) => {
          const expected =
            from !== to && src.length > 0 && dst.length < capacity && (dst.length === 0 || dst.at(-1) === src.at(-1));
          if (canPour(rods, from, to, capacity) !== expected) wrong.push(`${JSON.stringify(rods)} ${from}->${to}`);
        }),
      );
    expect(wrong).toEqual([]);
  });

  it('moves exactly the top ring, keeps every ring, and never overfills', () => {
    const wrong: string[] = [];
    for (const { capacity, rods } of positions)
      for (const [from, to] of legalPours(rods, capacity)) {
        const after = pour(rods, from, to);
        const expectedFrom = rods[from].slice(0, -1);
        const expectedTo = [...rods[to], rods[from].at(-1)];
        const ok =
          JSON.stringify(after[from]) === JSON.stringify(expectedFrom) &&
          JSON.stringify(after[to]) === JSON.stringify(expectedTo) &&
          JSON.stringify(sortedRings(after)) === JSON.stringify(sortedRings(rods)) &&
          after.every((rod) => rod.length <= capacity);
        if (!ok) wrong.push(`${JSON.stringify(rods)} ${from}->${to} gave ${JSON.stringify(after)}`);
      }
    expect(wrong).toEqual([]);
  });

  it('only calls a position solved when every color sits alone on one full rod', () => {
    const wrong = positions.filter(({ capacity, rods }) => {
      const sorted = rods.every((rod) => rod.length === 0 || (rod.length === capacity && new Set(rod).size === 1));
      return isHoopsSolved(rods, capacity) !== sorted;
    });
    expect(wrong).toEqual([]);
  });
});

describe('hoops solver on mid-game positions', () => {
  const rand = seededRandom(7);
  const positions = [1, 2, 4, 6, 8].flatMap((level) =>
    Array.from({ length: 6 }, () => {
      const states = randomWalk(generateLevel(level).rods, CAP, 4 + Math.floor(rand() * 12), rand);
      return states[states.length - 1];
    }),
  );

  it('agrees with brute force on whether a position can be solved, and how fast', () => {
    for (const rods of positions) {
      const path = solveHoops(rods, CAP);
      const fewest = fewestMovesByBruteForce(rods, CAP);
      expect(path?.length ?? null).toBe(fewest);
      if (path) expect(isHoopsSolved(play(rods, path, CAP), CAP)).toBe(true);
    }
  });

  it('includes dead ends among the sampled positions', () => {
    expect(positions.some((rods) => fewestMovesByBruteForce(rods, CAP) === null)).toBe(true);
  });

  it('does not change the position it is given', () => {
    const { rods } = generateLevel(12);
    const copy = JSON.stringify(rods);
    solveHoops(rods, levelSpec(12).capacity);
    expect(JSON.stringify(rods)).toBe(copy);
  });

  it('gives up and returns null when the search budget runs out', () => {
    const { rods } = generateLevel(40);
    const { capacity } = levelSpec(40);
    expect(solveHoops(rods, capacity, 5)).toBeNull();
    expect(solveHoops(rods, capacity)).not.toBeNull();
  });
});

describe('hoops level progression', () => {
  const specs = Array.from({ length: 200 }, (_, i) => levelSpec(i + 1));

  it('never makes rods shorter as levels go up', () => {
    specs.forEach((spec, i) => i > 0 && expect(spec.capacity).toBeGreaterThanOrEqual(specs[i - 1].capacity));
  });

  it('only steps difficulty every third level within a rod height', () => {
    specs.forEach((spec, i) => {
      if (i === 0 || spec.capacity !== specs[i - 1].capacity) return;
      expect(spec.colors - specs[i - 1].colors).toBeGreaterThanOrEqual(0);
      expect(spec.colors - specs[i - 1].colors).toBeLessThanOrEqual(1);
    });
    const runs = new Map<string, number>();
    specs.slice(0, 45).forEach((spec) => runs.set(`${spec.capacity}/${spec.colors}`, (runs.get(`${spec.capacity}/${spec.colors}`) ?? 0) + 1));
    expect([...runs.values()].every((count) => count === 3)).toBe(true);
  });

  it('never asks for more colors than the palette has', () => {
    expect(specs.every((spec) => spec.colors >= 3 && spec.colors <= MAX_COLORS)).toBe(true);
  });

  it('deals different rings for different levels', () => {
    const deals = new Set(Array.from({ length: 30 }, (_, i) => JSON.stringify(generateLevel(i + 1).rods)));
    expect(deals.size).toBe(30);
  });

  it('rerolls a deal that turns out to be unsolvable', () => {
    const { capacity } = levelSpec(78);
    const { rods, solution } = generateLevel(78);
    expect(isHoopsSolved(play(rods, solution, capacity), capacity)).toBe(true);
  });
});

describe('daily puzzle', () => {
  it('gets harder from Monday to Sunday', () => {
    const week = Array.from({ length: 7 }, (_, i) => dailySpec(20261012 + i));
    const rings = week.map((s) => s.colors * s.capacity);
    expect(rings).toEqual([...rings].sort((a, b) => a - b));
    expect(new Set(rings).size).toBe(7);
    week.slice(1).forEach((spec, i) => expect(spec.moves[0]).toBeGreaterThan(week[i].moves[1]));
  });

  it("keeps each day's best solution inside its weekday's band", () => {
    for (let key = 20261012; key <= 20261018; key++) {
      const [min, max] = dailySpec(key).moves;
      const { length } = generateDaily(key).solution;
      expect(length).toBeGreaterThanOrEqual(min);
      expect(length).toBeLessThanOrEqual(max);
    }
  });

  it('still deals the original puzzles for a week', () => {
    const week = JSON.stringify(Array.from({ length: 7 }, (_, i) => generateDaily(20261012 + i).rods));
    expect(createHash('sha256').update(week).digest('hex')).toBe(
      'f31173998e76d703891acaae66e530d4827a468b2dec3001550adc3250c16b02',
    );
  });

  it('deals the same puzzle for the same day and a new one each day', () => {
    expect(generateDaily(20261016)).toEqual(generateDaily(20261016));
    expect(generateDaily(20261017).rods).not.toEqual(generateDaily(20261016).rods);
    expect(generateDaily(20261023).rods).not.toEqual(generateDaily(20261016).rods);
  });

  it.each([20261012, 20261016, 20261018])('deals a fair, solvable puzzle for %i', (key) => {
    const { rods, solution } = generateDaily(key);
    const { colors, capacity } = dailySpec(key);
    expect(rods).toHaveLength(colors + EMPTY_RODS);
    expect(rods.some((rod) => isRodComplete(rod, capacity))).toBe(false);
    const end = solution.reduce((state, [from, to]) => {
      expect(canPour(state, from, to, capacity)).toBe(true);
      return pour(state, from, to);
    }, rods);
    expect(isHoopsSolved(end, capacity)).toBe(true);
  });
});
