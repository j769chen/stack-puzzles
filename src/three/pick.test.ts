import { PerspectiveCamera, Vector2, Vector3 } from 'three';
import { fitCamera } from './fit';
import { nearestRod } from './pick';

const HEIGHT = 3;
const REACH = 1;
const rods = [
  { x: -2, z: -2 },
  { x: 0, z: -2 },
  { x: -2, z: 2 },
  { x: 0, z: 2 },
];

const camera = new PerspectiveCamera(32, 0.66);
fitCamera(camera, { width: 5, height: HEIGHT, depth: 6 }, 1, 0.66);

const at = (x: number, y: number, z: number) => {
  const p = new Vector3(x, y, z).project(camera);
  return new Vector2(p.x, p.y);
};
const pick = (pointer: Vector2) => nearestRod(pointer, camera, rods, HEIGHT, REACH);

describe('nearestRod', () => {
  it('picks the rod under the finger anywhere along its height', () => {
    expect(pick(at(0, 0, 2))).toBe(3);
    expect(pick(at(0, HEIGHT / 2, 2))).toBe(3);
    expect(pick(at(0, HEIGHT, 2))).toBe(3);
  });

  it('picks the back rod when tapping low on it, right above the front row', () => {
    expect(pick(at(-2, 0.2, -2))).toBe(0);
    expect(pick(at(-2, HEIGHT - 0.2, 2))).toBe(2);
  });

  it('picks the closer rod when the finger lands between two', () => {
    expect(pick(at(-1.2, 1, 2))).toBe(2);
    expect(pick(at(-0.8, 1, 2))).toBe(3);
  });

  it('ignores taps far from every rod', () => {
    expect(pick(at(6, 1, 2))).toBeNull();
    expect(pick(new Vector2(0, -0.98))).toBeNull();
  });
});
