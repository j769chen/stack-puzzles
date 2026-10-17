import { pour } from '../hoops/logic';
import {
  HANOI_MAX_LEVEL,
  type HanoiState,
  canMoveDisk,
  createHanoi,
  disksForLevel,
  isHanoiSolved,
  minMoves,
} from './logic';

function allStates(disks: number): HanoiState[] {
  const states: HanoiState[] = [];
  for (let code = 0; code < 3 ** disks; code++) {
    const state: HanoiState = [[], [], []];
    for (let size = disks, rest = code; size >= 1; size--, rest = Math.floor(rest / 3)) state[rest % 3]!.push(size);
    states.push(state);
  }
  return states;
}

const key = (state: HanoiState) => state.map((peg) => peg.join(',')).join('|');

function distancesTo(target: HanoiState): Map<string, number> {
  const distance = new Map([[key(target), 0]]);
  for (let frontier = [target]; frontier.length; ) {
    const next: HanoiState[] = [];
    for (const state of frontier)
      for (let from = 0; from < 3; from++)
        for (let to = 0; to < 3; to++) {
          if (!canMoveDisk(state, from, to)) continue;
          const after = pour(state, from, to);
          if (distance.has(key(after))) continue;
          distance.set(key(after), distance.get(key(state))! + 1);
          next.push(after);
        }
    frontier = next;
  }
  return distance;
}

const isWellStacked = (state: HanoiState) => state.every((peg) => peg.every((d, i) => i === 0 || peg[i - 1]! > d));

describe('hanoi logic', () => {
  it('maps levels to disk counts and caps at the last level', () => {
    expect(disksForLevel(1)).toBe(3);
    expect(disksForLevel(HANOI_MAX_LEVEL)).toBe(10);
    expect(disksForLevel(HANOI_MAX_LEVEL + 5)).toBe(10);
  });

  it('stacks the starting tower largest first on the left peg', () => {
    expect(createHanoi(3)).toEqual([[3, 2, 1], [], []]);
  });

  it('only allows a disk onto an empty peg or a larger disk', () => {
    const state: HanoiState = [[3, 1], [2], []];
    expect(canMoveDisk(state, 0, 1)).toBe(true);
    expect(canMoveDisk(state, 0, 2)).toBe(true);
    expect(canMoveDisk(state, 1, 0)).toBe(false);
    expect(canMoveDisk(state, 2, 0)).toBe(false);
    expect(canMoveDisk(state, 0, 0)).toBe(false);
  });

  it('counts the tower as solved on either non-starting peg', () => {
    expect(isHanoiSolved(createHanoi(3), 3)).toBe(false);
    expect(isHanoiSolved([[], [3, 2, 1], []], 3)).toBe(true);
    expect(isHanoiSolved([[], [], [3, 2, 1]], 3)).toBe(true);
    expect(isHanoiSolved([[], [3, 2], [1]], 3)).toBe(false);
  });

  describe.each([1, 2, 3, 4, 5])('every position with %i disks', (disks) => {
    const states = allStates(disks);
    const tower = Array.from({ length: disks }, (_, i) => disks - i);
    const toRight = distancesTo([[], [], tower]);

    it('is reachable, so the search covers the whole game', () => {
      expect(toRight.size).toBe(3 ** disks);
      expect(states.every(isWellStacked)).toBe(true);
    });

    it('needs exactly the minimum move count to move the starting tower', () => {
      expect(toRight.get(key(createHanoi(disks)))).toBe(minMoves(disks));
    });

    it('only ever allows moves that keep every peg well stacked', () => {
      for (const state of states)
        for (let from = 0; from < 3; from++)
          for (let to = 0; to < 3; to++)
            if (canMoveDisk(state, from, to)) expect(isWellStacked(pour(state, from, to))).toBe(true);
    });
  });
});
