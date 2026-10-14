import {
  HANOI_MAX_LEVEL,
  type HanoiState,
  canMoveDisk,
  createHanoi,
  disksForLevel,
  isHanoiSolved,
  minMoves,
  moveDisk,
  nextHanoiMove,
} from './logic';

function solveWithHints(state: HanoiState, disks: number) {
  let moves = 0;
  for (let move = nextHanoiMove(state, disks); move; move = nextHanoiMove(state, disks)) {
    expect(canMoveDisk(state, ...move)).toBe(true);
    state = moveDisk(state, ...move);
    moves++;
  }
  return { state, moves };
}

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

  it('moves without mutating the previous state', () => {
    const state = createHanoi(3);
    expect(moveDisk(state, 0, 2)).toEqual([[3, 2], [], [1]]);
    expect(state).toEqual([[3, 2, 1], [], []]);
  });

  it('counts the tower as solved on either non-starting peg', () => {
    expect(isHanoiSolved(createHanoi(3), 3)).toBe(false);
    expect(isHanoiSolved([[], [3, 2, 1], []], 3)).toBe(true);
    expect(isHanoiSolved([[], [], [3, 2, 1]], 3)).toBe(true);
    expect(isHanoiSolved([[], [3, 2], [1]], 3)).toBe(false);
  });

  it.each([1, 3, 6, 10])('solves %i disks in the minimum moves by following hints', (disks) => {
    const { state, moves } = solveWithHints(createHanoi(disks), disks);
    expect(isHanoiSolved(state, disks)).toBe(true);
    expect(moves).toBe(minMoves(disks));
  });

  it('finishes from a scrambled mid-game state', () => {
    const { state } = solveWithHints([[5], [4, 1], [3, 2]], 5);
    expect(isHanoiSolved(state, 5)).toBe(true);
  });

  it('gives no hint once solved', () => {
    expect(nextHanoiMove([[], [], [3, 2, 1]], 3)).toBeNull();
  });
});
