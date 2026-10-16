import type { Move } from '../useHistory';
import { EMPTY_RODS, MinHeap, type Rods, mulberry32, pour } from '../hoops/logic';

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

const unsettled = (rods: Rods, sizes: number) => rods.reduce((sum, rod) => sum + rod.length - settled(rod, sizes), 0);
const stateKey = (rods: Rods) => rods.map((rod) => String.fromCharCode(...rod.map((ring) => ring + 65))).sort().join('|');

type SearchNode = { rods: Rods; cost: number; score: number; parent: SearchNode | null; move: Move | null };

export function solveTower(start: Rods, sizes: number, nodeLimit = 50_000): Move[] | null {
  const seen = new Set([stateKey(start)]);
  const open = new MinHeap<SearchNode>((a, b) => a.score < b.score);
  open.push({ rods: start, cost: 0, score: 0, parent: null, move: null });
  for (let expanded = 0; open.size > 0 && expanded < nodeLimit; expanded++) {
    const node = open.pop();
    if (isTowerSolved(node.rods, sizes)) {
      const path: Move[] = [];
      for (let n: SearchNode | null = node; n?.move; n = n.parent) path.unshift(n.move);
      return path;
    }
    for (let from = 0; from < node.rods.length; from++) {
      if (isTowerComplete(node.rods[from], sizes)) continue;
      let usedEmpty = false;
      for (let to = 0; to < node.rods.length; to++) {
        if (!canStack(node.rods, from, to, sizes)) continue;
        if (node.rods[to].length === 0) {
          if (usedEmpty) continue;
          usedEmpty = true;
        }
        const rods = pour(node.rods, from, to);
        const key = stateKey(rods);
        if (seen.has(key)) continue;
        seen.add(key);
        const cost = node.cost + 1;
        open.push({ rods, cost, score: cost + 3 * unsettled(rods, sizes), parent: node, move: [from, to] });
      }
    }
  }
  return null;
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

export function generateTower(level: number): Rods {
  const spec = towerSpec(level);
  const rand = mulberry32(level * 7727 + 3);
  for (;;) {
    const rods = deal(spec, rand);
    if (rods.some((rod) => isTowerComplete(rod, spec.sizes))) continue;
    if (solveTower(rods, spec.sizes)) return rods;
  }
}

const levels = new Map<number, Rods>();

export function towerLevel(level: number): Rods {
  let rods = levels.get(level);
  if (!rods) {
    rods = generateTower(level);
    levels.set(level, rods);
  }
  return rods;
}
