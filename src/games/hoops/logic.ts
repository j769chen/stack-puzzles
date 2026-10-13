export type Rods = number[][];
export type Move = [from: number, to: number];

export const CAPACITY = 4;
export const EMPTY_RODS = 2;
export const MAX_COLORS = 10;

export function colorsForLevel(level: number): number {
  return Math.min(3 + Math.floor((level - 1) / 3), MAX_COLORS);
}

function topRun(rod: number[]): number {
  const top = rod.at(-1);
  let n = 0;
  for (let i = rod.length - 1; i >= 0 && rod[i] === top; i--) n++;
  return n;
}

function isUniform(rod: number[]): boolean {
  return rod.every((c) => c === rod[0]);
}

export function canPour(rods: Rods, from: number, to: number, cap = CAPACITY): boolean {
  if (from === to) return false;
  const src = rods[from];
  const dst = rods[to];
  if (src.length === 0 || dst.length >= cap) return false;
  return dst.length === 0 || dst.at(-1) === src.at(-1);
}

export function liftCount(rods: Rods, from: number): number {
  return topRun(rods[from]);
}

export function pour(rods: Rods, from: number, to: number, cap = CAPACITY): Rods {
  const next = rods.map((r) => [...r]);
  const count = Math.min(topRun(next[from]), cap - next[to].length);
  for (let i = 0; i < count; i++) next[to].push(next[from].pop()!);
  return next;
}

export function isRodComplete(rod: number[], cap = CAPACITY): boolean {
  return rod.length === cap && isUniform(rod);
}

export function isHoopsSolved(rods: Rods, cap = CAPACITY): boolean {
  return rods.every((r) => r.length === 0 || isRodComplete(r, cap));
}

export function hasAnyMove(rods: Rods, cap = CAPACITY): boolean {
  return rods.some((_, f) => rods.some((_, t) => canPour(rods, f, t, cap)));
}

function candidateMoves(rods: Rods, cap: number): Move[] {
  const filled: Move[] = [];
  const empty: Move[] = [];
  for (let f = 0; f < rods.length; f++) {
    const src = rods[f];
    if (src.length === 0 || isRodComplete(src, cap)) continue;
    let usedEmpty = false;
    for (let t = 0; t < rods.length; t++) {
      if (!canPour(rods, f, t, cap)) continue;
      if (rods[t].length === 0) {
        if (usedEmpty || isUniform(src)) continue;
        usedEmpty = true;
        empty.push([f, t]);
      } else {
        filled.push([f, t]);
      }
    }
  }
  return [...filled, ...empty];
}

export function solveHoops(start: Rods, cap = CAPACITY, nodeLimit = 200_000): Move[] | null {
  const seen = new Set<string>();
  const path: Move[] = [];
  let nodes = 0;

  const dfs = (rods: Rods): boolean => {
    if (isHoopsSolved(rods, cap)) return true;
    if (++nodes > nodeLimit) return false;
    const key = rods.map((r) => r.join(',')).sort().join('|');
    if (seen.has(key)) return false;
    seen.add(key);
    for (const [f, t] of candidateMoves(rods, cap)) {
      path.push([f, t]);
      if (dfs(pour(rods, f, t, cap))) return true;
      path.pop();
    }
    return false;
  };

  return dfs(start) ? path : null;
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

export function generateLevel(level: number, cap = CAPACITY): Rods {
  const colors = colorsForLevel(level);
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
