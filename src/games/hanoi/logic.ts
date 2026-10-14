import type { Move } from '../useHistory';

export type HanoiState = number[][];

export const HANOI_MAX_LEVEL = 8;

export function disksForLevel(level: number): number {
  return Math.min(level + 2, HANOI_MAX_LEVEL + 2);
}

export function createHanoi(disks: number): HanoiState {
  return [Array.from({ length: disks }, (_, i) => disks - i), [], []];
}

export function canMoveDisk(state: HanoiState, from: number, to: number): boolean {
  if (from === to) return false;
  const disk = state[from].at(-1);
  if (disk === undefined) return false;
  const target = state[to].at(-1);
  return target === undefined || target > disk;
}

export function moveDisk(state: HanoiState, from: number, to: number): HanoiState {
  const next = state.map((peg) => [...peg]);
  next[to].push(next[from].pop()!);
  return next;
}

export function isHanoiSolved(state: HanoiState, disks: number): boolean {
  return state[0].length === 0 && state.some((peg) => peg.length === disks);
}

export function minMoves(disks: number): number {
  return 2 ** disks - 1;
}

export function nextHanoiMove(state: HanoiState, disks: number): Move | null {
  const pos: number[] = [];
  state.forEach((peg, i) => peg.forEach((d) => (pos[d] = i)));
  const target = pos[disks] === 0 ? 2 : pos[disks];

  const solve = (n: number, to: number): Move | null => {
    if (n === 0) return null;
    if (pos[n] === to) return solve(n - 1, to);
    const aux = 3 - pos[n] - to;
    return solve(n - 1, aux) ?? [pos[n], to];
  };

  return solve(disks, target);
}
