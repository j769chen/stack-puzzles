import { type Rods, pour } from './hoops/logic';
import type { Task } from './task';

const stateKey = (rods: Rods) => rods.map((rod) => String.fromCharCode(...rod)).sort().join('|');

const fromKey = (key: string) => key.split('|').map((rod) => Array.from(rod, (ring) => ring.charCodeAt(0)));

export function* deadEndTask(
  start: Rods,
  canPour: (rods: Rods, from: number, to: number) => boolean,
  isSolved: (rods: Rods) => boolean,
  limit = 20_000,
): Task<boolean> {
  const seen = new Set([stateKey(start)]);
  const pending = [...seen];
  while (pending.length > 0) {
    const rods = fromKey(pending.pop()!);
    if (isSolved(rods)) return false;
    for (let from = 0; from < rods.length; from++) {
      for (let to = 0; to < rods.length; to++) {
        if (!canPour(rods, from, to)) continue;
        const next = pour(rods, from, to);
        const key = stateKey(next);
        if (seen.has(key)) continue;
        if (seen.size >= limit) return false;
        seen.add(key);
        pending.push(key);
      }
    }
    yield;
  }
  return true;
}
