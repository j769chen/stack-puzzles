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

export function pour(rods: Rods, from: number, to: number, cap: number): Rods {
  const next = rods.map((r) => [...r]);
  const count = Math.min(topRun(next[from]), cap - next[to].length);
  for (let i = 0; i < count; i++) next[to].push(next[from].pop()!);
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

function movesLeftLowerBound(rods: Rods): number {
  let bound = 0;
  const bottoms = new Map<number, number>();
  for (const rod of rods) {
    if (rod.length === 0) continue;
    for (let i = 1; i < rod.length; i++) if (rod[i] !== rod[i - 1]) bound++;
    bottoms.set(rod[0], (bottoms.get(rod[0]) ?? 0) + 1);
  }
  for (const count of bottoms.values()) bound += count - 1;
  return bound;
}

const stateKey = (rods: Rods) => rods.map((r) => r.join(',')).sort().join('|');

type SearchNode = { rods: Rods; cost: number; parent: SearchNode | null; move: Move | null };

class MinHeap<T> {
  private items: { priority: number; value: T }[] = [];

  get size() {
    return this.items.length;
  }

  push(priority: number, value: T) {
    const items = this.items;
    items.push({ priority, value });
    for (let i = items.length - 1; i > 0; ) {
      const parent = (i - 1) >> 1;
      if (items[parent].priority <= items[i].priority) break;
      [items[i], items[parent]] = [items[parent], items[i]];
      i = parent;
    }
  }

  pop(): T {
    const items = this.items;
    const top = items[0].value;
    const last = items.pop()!;
    if (items.length === 0) return top;
    items[0] = last;
    for (let i = 0; ; ) {
      const left = 2 * i + 1;
      const right = left + 1;
      let min = i;
      if (left < items.length && items[left].priority < items[min].priority) min = left;
      if (right < items.length && items[right].priority < items[min].priority) min = right;
      if (min === i) return top;
      [items[i], items[min]] = [items[min], items[i]];
      i = min;
    }
  }
}

export function solveHoops(start: Rods, cap: number, nodeLimit = 200_000): Move[] | null {
  const bestCost = new Map([[stateKey(start), 0]]);
  const open = new MinHeap<SearchNode>();
  open.push(movesLeftLowerBound(start), { rods: start, cost: 0, parent: null, move: null });

  for (let expanded = 0; open.size > 0 && expanded < nodeLimit; ) {
    const node = open.pop();
    if (bestCost.get(stateKey(node.rods))! < node.cost) continue;
    if (isHoopsSolved(node.rods, cap)) {
      const path: Move[] = [];
      for (let n: SearchNode | null = node; n?.move; n = n.parent) path.unshift(n.move);
      return path;
    }
    expanded++;
    for (const [f, t] of candidateMoves(node.rods, cap)) {
      const rods = pour(node.rods, f, t, cap);
      const key = stateKey(rods);
      const cost = node.cost + 1;
      if ((bestCost.get(key) ?? Infinity) <= cost) continue;
      bestCost.set(key, cost);
      open.push(cost + movesLeftLowerBound(rods), { rods, cost, parent: node, move: [f, t] });
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

export function generateLevel(level: number): Rods {
  const { colors, capacity: cap } = levelSpec(level);
  const rand = mulberry32(level * 9973 + 17);

  for (;;) {
    const rings = Array.from({ length: colors * cap }, (_, i) => Math.floor(i / cap));
    for (let i = rings.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [rings[i], rings[j]] = [rings[j], rings[i]];
    }
    const rods: Rods = Array.from({ length: colors }, (_, i) => rings.slice(i * cap, (i + 1) * cap));
    for (let i = 0; i < EMPTY_RODS; i++) rods.push([]);

    if (rods.some((r) => isRodComplete(r, cap))) continue;
    if (solveHoops(rods, cap)) return rods;
  }
}
