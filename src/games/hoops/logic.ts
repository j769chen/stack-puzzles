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

function candidateMoves(rods: Rods, cap: number): Move[] {
  const moves: Move[] = [];
  for (let f = 0; f < rods.length; f++) {
    const src = rods[f];
    if (src.length === 0 || isRodComplete(src, cap)) continue;
    let usedEmpty = false;
    for (let t = 0; t < rods.length; t++) {
      if (!canPour(rods, f, t, cap)) continue;
      if (rods[t].length === 0) {
        if (usedEmpty || isUniform(src)) continue;
        usedEmpty = true;
      }
      moves.push([f, t]);
    }
  }
  return moves;
}

function bottomRun(rod: number[]): number {
  let run = 0;
  while (run < rod.length && rod[run] === rod[0]) run++;
  return run;
}

function movesLeftLowerBound(rods: Rods): number {
  let bound = 0;
  const bottomRuns = new Map<number, number[]>();
  for (const rod of rods) {
    if (rod.length === 0) continue;
    const run = bottomRun(rod);
    bound += rod.length - run;
    bottomRuns.set(rod[0], [...(bottomRuns.get(rod[0]) ?? []), run]);
  }
  for (const runs of bottomRuns.values()) bound += runs.reduce((a, b) => a + b, 0) - Math.max(...runs);
  return bound;
}

const stateKey = (rodKeys: string[]) => [...rodKeys].sort().join('|');

type SearchNode = {
  rods: Rods;
  rodKeys: string[];
  key: string;
  cost: number;
  estimatedLength: number;
  parent: SearchNode | null;
  move: Move | null;
};

const exploresFirst = (a: SearchNode, b: SearchNode) =>
  a.estimatedLength !== b.estimatedLength ? a.estimatedLength < b.estimatedLength : a.cost > b.cost;

class MinHeap<T> {
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

export function solveHoops(start: Rods, cap: number, nodeLimit = 200_000): Move[] | null {
  const startKeys = start.map((rod) => String.fromCharCode(...rod));
  const startKey = stateKey(startKeys);
  const bestCost = new Map([[startKey, 0]]);
  const open = new MinHeap<SearchNode>(exploresFirst);
  open.push({
    rods: start,
    rodKeys: startKeys,
    key: startKey,
    cost: 0,
    estimatedLength: movesLeftLowerBound(start),
    parent: null,
    move: null,
  });

  for (let expanded = 0; open.size > 0 && expanded < nodeLimit; ) {
    const node = open.pop();
    if (bestCost.get(node.key)! < node.cost) continue;
    if (isHoopsSolved(node.rods, cap)) {
      const path: Move[] = [];
      for (let n: SearchNode | null = node; n?.move; n = n.parent) path.unshift(n.move);
      return path;
    }
    expanded++;
    for (const [f, t] of candidateMoves(node.rods, cap)) {
      const rodKeys = [...node.rodKeys];
      rodKeys[t] += rodKeys[f].at(-1);
      rodKeys[f] = rodKeys[f].slice(0, -1);
      const key = stateKey(rodKeys);
      const cost = node.cost + 1;
      if ((bestCost.get(key) ?? Infinity) <= cost) continue;
      bestCost.set(key, cost);
      const rods = pour(node.rods, f, t);
      open.push({ rods, rodKeys, key, cost, estimatedLength: cost + movesLeftLowerBound(rods), parent: node, move: [f, t] });
    }
  }
  return null;
}

function mulberry32(seed: number): () => number {
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

const DAILY_SPECS: LevelSpec[] = [
  { colors: 9, capacity: 5 },
  { colors: 5, capacity: 4 },
  { colors: 6, capacity: 4 },
  { colors: 7, capacity: 4 },
  { colors: 8, capacity: 4 },
  { colors: 7, capacity: 5 },
  { colors: 8, capacity: 5 },
];

export function dailyKey(date: Date): number {
  return date.getFullYear() * 10000 + (date.getMonth() + 1) * 100 + date.getDate();
}

export function dailyDate(key: number): Date {
  return new Date(Math.floor(key / 10000), (Math.floor(key / 100) % 100) - 1, key % 100);
}

export function dailySpec(key: number): LevelSpec {
  return DAILY_SPECS[dailyDate(key).getDay()];
}

export function generateLevel(level: number): Deal {
  return generateDeal(levelSpec(level), level * 9973 + 17);
}

export function generateDaily(key: number): Deal {
  return generateDeal(dailySpec(key), key * 7919 + 1);
}

function generateDeal({ colors, capacity: cap }: LevelSpec, seed: number): Deal {
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
    const solution = solveHoops(rods, cap);
    if (solution) return { rods, solution };
  }
}
