import { createHash } from 'crypto';
import { pour } from '../hoops/logic';
import {
  canStack,
  generateTower,
  isTowerComplete,
  isTowerSolved,
  ringColor,
  ringSize,
  solveTower,
  towerSpec,
} from './logic';

const ring = (color: number, size: number, sizes = 3) => color * sizes + size;

describe('tower sort rules', () => {
  it('reads color and size from a ring', () => {
    expect(ringColor(ring(2, 1), 3)).toBe(2);
    expect(ringSize(ring(2, 1), 3)).toBe(1);
  });

  it('stacks a ring on an empty rod or a bigger ring of any color, never an equal or smaller one', () => {
    const rods = [[ring(0, 2)], [ring(1, 1)], [ring(2, 1)], []];
    expect(canStack(rods, 1, 0, 3)).toBe(true);
    expect(canStack(rods, 1, 3, 3)).toBe(true);
    expect(canStack(rods, 1, 2, 3)).toBe(false);
    expect(canStack(rods, 0, 1, 3)).toBe(false);
    expect(canStack(rods, 3, 0, 3)).toBe(false);
    expect(canStack(rods, 0, 0, 3)).toBe(false);
  });

  it('completes a rod only with one color, largest at the bottom, every size present', () => {
    expect(isTowerComplete([ring(1, 2), ring(1, 1), ring(1, 0)], 3)).toBe(true);
    expect(isTowerComplete([ring(1, 2), ring(0, 1), ring(1, 0)], 3)).toBe(false);
    expect(isTowerComplete([ring(1, 2), ring(1, 1)], 3)).toBe(false);
    expect(isTowerSolved([[ring(0, 2), ring(0, 1), ring(0, 0)], []], 3)).toBe(true);
    expect(isTowerSolved([[ring(0, 2), ring(0, 1)], [ring(0, 0)]], 3)).toBe(false);
  });
});

describe('tower sort levels', () => {
  it('starts small and grows to five colors of four sizes', () => {
    expect(towerSpec(1)).toEqual({ colors: 3, sizes: 3 });
    expect(towerSpec(5)).toEqual({ colors: 4, sizes: 3 });
    expect(towerSpec(9)).toEqual({ colors: 3, sizes: 4 });
    expect(towerSpec(13)).toEqual({ colors: 4, sizes: 4 });
    expect(towerSpec(21)).toEqual({ colors: 5, sizes: 4 });
    expect(towerSpec(500)).toEqual({ colors: 5, sizes: 4 });
  });

  it('still deals the original rings for levels 1 to 30', () => {
    const levels = JSON.stringify(Array.from({ length: 30 }, (_, i) => generateTower(i + 1)));
    expect(createHash('sha256').update(levels).digest('hex')).toBe(
      '282f1af7468dc6d343ba3627ae9451579075c09a25247a9c2f68999dfe009841',
    );
  });

  it('deals the same rings for the same level', () => {
    expect(generateTower(6)).toEqual(generateTower(6));
    expect(generateTower(7)).not.toEqual(generateTower(6));
  });

  it.each([1, 5, 9, 13, 21, 30])('deals a legal, unsolved, solvable level %i', (level) => {
    const { colors, sizes } = towerSpec(level);
    const rods = generateTower(level);
    expect(rods).toHaveLength(colors + 2);
    expect(rods.flat().sort((a, b) => a - b)).toEqual(Array.from({ length: colors * sizes }, (_, i) => i));
    rods.forEach((rod) => rod.forEach((r, i) => i > 0 && expect(ringSize(r, sizes)).toBeLessThan(ringSize(rod[i - 1], sizes))));
    expect(rods.some((rod) => isTowerComplete(rod, sizes))).toBe(false);
    const end = solveTower(rods, sizes)!.reduce((state, [from, to]) => {
      expect(canStack(state, from, to, sizes)).toBe(true);
      return pour(state, from, to);
    }, rods);
    expect(isTowerSolved(end, sizes)).toBe(true);
  });

  it('gives up when the search budget runs out', () => {
    expect(solveTower(generateTower(21), 4, 1)).toBeNull();
  });
});
