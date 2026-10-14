import { PerspectiveCamera, Vector3 } from 'three';
import { fitCamera } from './fit';

const size = { width: 10, height: 4, depth: 3 };

function corners() {
  const points: Vector3[] = [];
  for (const x of [-size.width / 2, size.width / 2])
    for (const y of [0, size.height])
      for (const z of [-size.depth / 2, size.depth / 2]) points.push(new Vector3(x, y, z));
  return points;
}

const maxExtent = (camera: PerspectiveCamera) =>
  Math.max(
    ...corners().map((c) => {
      const p = c.project(camera);
      return Math.max(Math.abs(p.x), Math.abs(p.y));
    }),
  );

describe('fitCamera', () => {
  it.each([0.5, 1, 2])('frames the whole board tightly at aspect %p', (aspect) => {
    const camera = new PerspectiveCamera(32, aspect);
    fitCamera(camera, size, 0.55);
    expect(maxExtent(camera)).toBeLessThanOrEqual(0.94);
    expect(maxExtent(camera)).toBeGreaterThan(0.93);
  });

  it('looks down at the board from the tilt angle', () => {
    const camera = new PerspectiveCamera(32, 1);
    fitCamera(camera, size, 0.85);
    const offset = camera.position.clone().sub(new Vector3(0, size.height / 2, 0));
    expect(offset.x).toBeCloseTo(0);
    expect(Math.atan2(offset.y, offset.z)).toBeCloseTo(0.85);
  });
});
