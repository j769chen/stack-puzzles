import { isDeadEnd } from './deadEnd';
import { type Rods, canPour, generateLevel, isHoopsSolved, levelSpec } from './hoops/logic';
import { canStack, generateTower, isTowerSolved, towerSpec } from './towersort/logic';

const ringSort = (cap: number) =>
  [(rods: Rods, from: number, to: number) => canPour(rods, from, to, cap), (rods: Rods) => isHoopsSolved(rods, cap)] as const;

describe('isDeadEnd', () => {
  it('finds a dead end with no legal move', () => {
    expect(isDeadEnd([[1, 0, 1, 0], [2, 0, 2, 0], [1, 2, 1, 2], [2]], ...ringSort(4))).toBe(true);
  });

  it('finds a dead end that still has legal moves', () => {
    const rods = [[1, 2], [2, 0, 0, 0], [2, 1, 0, 2], [1, 1]];
    expect(canPour(rods, 2, 0, 4)).toBe(true);
    expect(isDeadEnd(rods, ...ringSort(4))).toBe(true);
  });

  it('is not a dead end when the puzzle can still be solved', () => {
    expect(isDeadEnd([[1, 2, 1], [2, 0, 0, 0], [2, 1, 0, 2], [1]], ...ringSort(4))).toBe(false);
    expect(isDeadEnd(generateLevel(10).rods, ...ringSort(levelSpec(10).capacity))).toBe(false);
  });

  it('is not a dead end once solved', () => {
    expect(isDeadEnd([[0, 0, 0, 0], [1, 1, 1, 1], []], ...ringSort(4))).toBe(false);
  });

  it('does not call a position a dead end when it runs out of room to prove it', () => {
    const { rods } = generateLevel(60);
    const { capacity } = levelSpec(60);
    const [fits, solved] = ringSort(capacity);
    expect(isDeadEnd(rods, fits, solved, 5)).toBe(false);
  });

  it('works with Tower Sort rules', () => {
    const { sizes } = towerSpec(5);
    const fits = (rods: Rods, from: number, to: number) => canStack(rods, from, to, sizes);
    expect(isDeadEnd(generateTower(5), fits, (rods) => isTowerSolved(rods, sizes))).toBe(false);
    expect(isDeadEnd([[2, 1], [5, 4, 3], [8, 7, 6], [0], []], (rods, from, to) => canStack(rods, from, to, 3), (rods) => isTowerSolved(rods, 3))).toBe(false);
  });
});
