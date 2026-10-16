import { EMPTY_RODS, MinHeap, type Rods, mulberry32 } from '../hoops/logic';
import { type Task, runTask } from '../task';
import type { Move } from '../useHistory';

export type TowerSpec = { colors: number; sizes: number };

const TIERS = [
  { colors: 3, sizes: 3, levels: 4 },
  { colors: 4, sizes: 3, levels: 4 },
  { colors: 3, sizes: 4, levels: 4 },
  { colors: 4, sizes: 4, levels: 8 },
];
const LAST: TowerSpec = { colors: 5, sizes: 4 };

export function towerSpec(level: number): TowerSpec {
  let tierStart = 1;
  for (const { colors, sizes, levels } of TIERS) {
    if (level < tierStart + levels) return { colors, sizes };
    tierStart += levels;
  }
  return LAST;
}

export const ringColor = (ring: number, sizes: number) => Math.floor(ring / sizes);
export const ringSize = (ring: number, sizes: number) => ring % sizes;

export function canStack(rods: Rods, from: number, to: number, sizes: number): boolean {
  const ring = rods[from].at(-1);
  if (from === to || ring === undefined) return false;
  const under = rods[to].at(-1);
  return under === undefined || ringSize(under, sizes) > ringSize(ring, sizes);
}

function settled(rod: number[], sizes: number): number {
  let n = 0;
  while (n < rod.length && ringColor(rod[n], sizes) === ringColor(rod[0], sizes) && ringSize(rod[n], sizes) === sizes - 1 - n) n++;
  return n;
}

export function isTowerComplete(rod: number[], sizes: number): boolean {
  return rod.length === sizes && settled(rod, sizes) === sizes;
}

export function isTowerSolved(rods: Rods, sizes: number): boolean {
  return rods.every((rod) => rod.length === 0 || isTowerComplete(rod, sizes));
}

const NODE_LIMIT = 50_000;
const YIELD_EVERY = 64;

const stateKey = (rods: string[]) => rods.slice().sort().join('|');

type SearchNode = { rods: string[]; cost: number; score: number; parent: SearchNode | null; move: Move | null };

function* searchTower(start: Rods, sizes: number, nodeLimit: number): Task<Move[] | null> {
  const size = (rod: string, i: number) => rod.charCodeAt(i) % sizes;
  const color = (rod: string, i: number) => Math.floor(rod.charCodeAt(i) / sizes);
  const settledCount = (rod: string) => {
    let n = 0;
    while (n < rod.length && color(rod, n) === color(rod, 0) && size(rod, n) === sizes - 1 - n) n++;
    return n;
  };
  const complete = (rod: string) => rod.length === sizes && settledCount(rod) === sizes;
  const unsettled = (rods: string[]) => rods.reduce((sum, rod) => sum + rod.length - settledCount(rod), 0);

  const startRods = start.map((rod) => String.fromCharCode(...rod));
  const seen = new Set([stateKey(startRods)]);
  const open = new MinHeap<SearchNode>((a, b) => a.score < b.score);
  open.push({ rods: startRods, cost: 0, score: 0, parent: null, move: null });
  for (let expanded = 0; open.size > 0 && expanded < nodeLimit; expanded++) {
    if (expanded % YIELD_EVERY === 0) yield;
    const node = open.pop();
    const { rods } = node;
    if (rods.every((rod) => rod.length === 0 || complete(rod))) {
      const path: Move[] = [];
      for (let n: SearchNode | null = node; n?.move; n = n.parent) path.unshift(n.move);
      return path;
    }
    const cost = node.cost + 1;
    for (let from = 0; from < rods.length; from++) {
      const src = rods[from];
      if (src.length === 0 || complete(src)) continue;
      const ring = size(src, src.length - 1);
      let usedEmpty = false;
      for (let to = 0; to < rods.length; to++) {
        const dst = rods[to];
        if (to === from) continue;
        if (dst.length === 0) {
          if (usedEmpty) continue;
          usedEmpty = true;
        } else if (size(dst, dst.length - 1) <= ring) continue;
        const next = rods.slice();
        next[to] = dst + src[src.length - 1];
        next[from] = src.slice(0, -1);
        const key = stateKey(next);
        if (seen.has(key)) continue;
        seen.add(key);
        open.push({ rods: next, cost, score: cost + 3 * unsettled(next), parent: node, move: [from, to] });
      }
    }
  }
  return null;
}

export function solveTower(start: Rods, sizes: number, nodeLimit = NODE_LIMIT): Move[] | null {
  return runTask(searchTower(start, sizes, nodeLimit));
}

function deal({ colors, sizes }: TowerSpec, rand: () => number): Rods {
  const rods: Rods = Array.from({ length: colors + EMPTY_RODS }, () => []);
  const bases = rods.map((_, i) => i);
  for (let i = bases.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [bases[i], bases[j]] = [bases[j], bases[i]];
  }
  for (let color = 0; color < colors; color++) rods[bases[color]].push(color * sizes + sizes - 1);
  for (let size = sizes - 2; size >= 0; size--) {
    for (let color = 0; color < colors; color++) {
      const fits = bases.filter((rod) => rods[rod].length === 0 || ringSize(rods[rod].at(-1)!, sizes) > size);
      rods[fits[Math.floor(rand() * fits.length)]].push(color * sizes + size);
    }
  }
  return rods;
}

export function* towerTask(level: number): Task<Rods> {
  const spec = towerSpec(level);
  const rand = mulberry32(level * 7727 + 3);
  for (;;) {
    const rods = deal(spec, rand);
    if (rods.some((rod) => isTowerComplete(rod, spec.sizes))) continue;
    if (yield* searchTower(rods, spec.sizes, NODE_LIMIT)) return rods;
  }
}

export function generateTower(level: number): Rods {
  return runTask(towerTask(level));
}
