import { type Task, runTask } from '../task';
import type { Move } from '../useHistory';

export type Rods = number[][];

export const EMPTY_RODS = 2;
export const MAX_COLORS = 10;

const LEVELS_PER_COLOR = 3;
const TIERS = [
  { capacity: 4, firstColors: 3 },
  { capacity: 5, firstColors: 7 },
  { capacity: 6, firstColors: 7 },
];

export type LevelSpec = { colors: number; capacity: number };

export function levelSpec(level: number): LevelSpec {
  let tierStart = 1;
  for (const { capacity, firstColors } of TIERS) {
    const tierLevels = (MAX_COLORS - firstColors + 1) * LEVELS_PER_COLOR;
    if (level < tierStart + tierLevels) {
      return { capacity, colors: firstColors + Math.floor((level - tierStart) / LEVELS_PER_COLOR) };
    }
    tierStart += tierLevels;
  }
  return { capacity: TIERS[TIERS.length - 1].capacity, colors: MAX_COLORS };
}

export function topRun(rod: number[]): number {
  const top = rod.at(-1);
  let n = 0;
  for (let i = rod.length - 1; i >= 0 && rod[i] === top; i--) n++;
  return n;
}

function isUniform(rod: number[]): boolean {
  return rod.every((c) => c === rod[0]);
}

export function canPour(rods: Rods, from: number, to: number, cap: number): boolean {
  if (from === to) return false;
  const src = rods[from];
  const dst = rods[to];
  if (src.length === 0 || dst.length >= cap) return false;
  return dst.length === 0 || dst.at(-1) === src.at(-1);
}

export function pour(rods: Rods, from: number, to: number): Rods {
  const next = rods.map((r) => [...r]);
  next[to].push(next[from].pop()!);
  return next;
}

export function isRodComplete(rod: number[], cap: number): boolean {
  return rod.length === cap && isUniform(rod);
}

export function isHoopsSolved(rods: Rods, cap: number): boolean {
  return rods.every((r) => r.length === 0 || isRodComplete(r, cap));
}

export function hasAnyMove(rods: Rods, cap: number): boolean {
  return rods.some((_, f) => rods.some((_, t) => canPour(rods, f, t, cap)));
}

export class MinHeap<T> {
  private items: T[] = [];

  constructor(private readonly before: (a: T, b: T) => boolean) {}

  get size() {
    return this.items.length;
  }

  push(value: T) {
    const items = this.items;
    items.push(value);
    for (let i = items.length - 1; i > 0; ) {
      const parent = (i - 1) >> 1;
      if (!this.before(items[i], items[parent])) break;
      [items[i], items[parent]] = [items[parent], items[i]];
      i = parent;
    }
  }

  pop(): T {
    const items = this.items;
    const top = items[0];
    const last = items.pop()!;
    if (items.length === 0) return top;
    items[0] = last;
    for (let i = 0; ; ) {
      const left = 2 * i + 1;
      const right = left + 1;
      let first = i;
      if (left < items.length && this.before(items[left], items[first])) first = left;
      if (right < items.length && this.before(items[right], items[first])) first = right;
      if (first === i) return top;
      [items[i], items[first]] = [items[first], items[i]];
      i = first;
    }
  }
}

const NODE_LIMIT = 200_000;
const YIELD_EVERY = 64;

type SearchNode = {
  rods: string[];
  key: string;
  cost: number;
  estimatedLength: number;
  parent: SearchNode | null;
  move: Move | null;
};

const exploresFirst = (a: SearchNode, b: SearchNode) =>
  a.estimatedLength !== b.estimatedLength ? a.estimatedLength < b.estimatedLength : a.cost > b.cost;

const stateKey = (rods: string[]) => rods.slice().sort().join('|');

function bottomRun(rod: string): number {
  let run = 1;
  while (run < rod.length && rod.charCodeAt(run) === rod.charCodeAt(0)) run++;
  return run;
}

function* searchHoops(start: Rods, cap: number, nodeLimit: number): Task<Move[] | null> {
  const colors = Math.max(0, ...start.flat()) + 1;
  const runSums = new Array<number>(colors);
  const runMaxes = new Array<number>(colors);
  const uniform = (rod: string) => rod.length === 0 || bottomRun(rod) === rod.length;
  const complete = (rod: string) => rod.length === cap && uniform(rod);
  const movesLeftLowerBound = (rods: string[]) => {
    runSums.fill(0);
    runMaxes.fill(0);
    let bound = 0;
    for (const rod of rods) {
      if (rod.length === 0) continue;
      const run = bottomRun(rod);
      const color = rod.charCodeAt(0);
      bound += rod.length - run;
      runSums[color] += run;
      runMaxes[color] = Math.max(runMaxes[color], run);
    }
    for (let color = 0; color < colors; color++) bound += runSums[color] - runMaxes[color];
    return bound;
  };

  const startRods = start.map((rod) => String.fromCharCode(...rod));
  const startKey = stateKey(startRods);
  const bestCost = new Map([[startKey, 0]]);
  const open = new MinHeap<SearchNode>(exploresFirst);
  open.push({
    rods: startRods,
    key: startKey,
    cost: 0,
    estimatedLength: movesLeftLowerBound(startRods),
    parent: null,
    move: null,
  });

  for (let expanded = 0; open.size > 0 && expanded < nodeLimit; ) {
    const node = open.pop();
    if (bestCost.get(node.key)! < node.cost) continue;
    const { rods } = node;
    if (rods.every((rod) => rod.length === 0 || complete(rod))) {
      const path: Move[] = [];
      for (let n: SearchNode | null = node; n?.move; n = n.parent) path.unshift(n.move);
      return path;
    }
    expanded++;
    if (expanded % YIELD_EVERY === 0) yield;
    const cost = node.cost + 1;
    for (let f = 0; f < rods.length; f++) {
      const src = rods[f];
      if (src.length === 0 || complete(src)) continue;
      const ring = src.charCodeAt(src.length - 1);
      let usedEmpty = false;
      for (let t = 0; t < rods.length; t++) {
        const dst = rods[t];
        if (t === f || dst.length >= cap) continue;
        if (dst.length === 0) {
          if (usedEmpty || uniform(src)) continue;
          usedEmpty = true;
        } else if (dst.charCodeAt(dst.length - 1) !== ring) continue;
        const next = rods.slice();
        next[t] = dst + src[src.length - 1];
        next[f] = src.slice(0, -1);
        const key = stateKey(next);
        if ((bestCost.get(key) ?? Infinity) <= cost) continue;
        bestCost.set(key, cost);
        open.push({ rods: next, key, cost, estimatedLength: cost + movesLeftLowerBound(next), parent: node, move: [f, t] });
      }
    }
  }
  return null;
}

export function solveHoops(start: Rods, cap: number, nodeLimit = NODE_LIMIT): Move[] | null {
  return runTask(searchHoops(start, cap, nodeLimit));
}

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type Deal = { rods: Rods; solution: Move[] };

export type DailySpec = LevelSpec & { moves: [number, number] };

const DAILY_SPECS: DailySpec[] = [
  { colors: 9, capacity: 5, moves: [45, 50] },
  { colors: 5, capacity: 4, moves: [15, 18] },
  { colors: 6, capacity: 4, moves: [20, 23] },
  { colors: 7, capacity: 4, moves: [24, 27] },
  { colors: 8, capacity: 4, moves: [28, 31] },
  { colors: 7, capacity: 5, moves: [33, 37] },
  { colors: 8, capacity: 5, moves: [39, 43] },
];

export function dailyKey(date: Date): number {
  return date.getFullYear() * 10000 + (date.getMonth() + 1) * 100 + date.getDate();
}

export function dailyDate(key: number): Date {
  return new Date(Math.floor(key / 10000), (Math.floor(key / 100) % 100) - 1, key % 100);
}

export function dailySpec(key: number): DailySpec {
  return DAILY_SPECS[dailyDate(key).getDay()];
}

export function levelTask(level: number): Task<Deal> {
  return dealTask(levelSpec(level), level * 9973 + 17);
}

export function generateLevel(level: number): Deal {
  return runTask(levelTask(level));
}

export function previousDay(key: number): number {
  const date = dailyDate(key);
  date.setDate(date.getDate() - 1);
  return dailyKey(date);
}

export function dailyTask(key: number): Task<Deal> {
  const spec = dailySpec(key);
  const [min, max] = spec.moves;
  return dealTask(spec, key * 7919 + 1, (length) => length >= min && length <= max);
}

export function generateDaily(key: number): Deal {
  return runTask(dailyTask(key));
}

function* dealTask({ colors, capacity: cap }: LevelSpec, seed: number, fits = (_length: number) => true): Task<Deal> {
  const rand = mulberry32(seed);

  for (;;) {
    const rings = Array.from({ length: colors * cap }, (_, i) => Math.floor(i / cap));
    for (let i = rings.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [rings[i], rings[j]] = [rings[j], rings[i]];
    }
    const rods: Rods = Array.from({ length: colors }, (_, i) => rings.slice(i * cap, (i + 1) * cap));
    for (let i = 0; i < EMPTY_RODS; i++) rods.push([]);

    if (rods.some((r) => isRodComplete(r, cap))) continue;
    const solution = yield* searchHoops(rods, cap, NODE_LIMIT);
    if (solution && fits(solution.length)) return { rods, solution };
  }
}
