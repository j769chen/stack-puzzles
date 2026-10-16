import { type Rods, pour } from './hoops/logic';

const stateKey = (rods: Rods) => rods.map((rod) => String.fromCharCode(...rod)).sort().join('|');

export function isDeadEnd(
  start: Rods,
  canPour: (rods: Rods, from: number, to: number) => boolean,
  isSolved: (rods: Rods) => boolean,
  limit = 300,
): boolean {
  const seen = new Set([stateKey(start)]);
  const pending = [start];
  while (pending.length > 0) {
    const rods = pending.pop()!;
    if (isSolved(rods)) return false;
    for (let from = 0; from < rods.length; from++) {
      for (let to = 0; to < rods.length; to++) {
        if (!canPour(rods, from, to)) continue;
        const next = pour(rods, from, to);
        const key = stateKey(next);
        if (seen.has(key)) continue;
        if (seen.size >= limit) return false;
        seen.add(key);
        pending.push(next);
      }
    }
  }
  return true;
}
