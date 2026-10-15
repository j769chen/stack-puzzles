import { MathUtils, type PerspectiveCamera, Vector2, Vector3 } from 'three';

export type RodSpot = { x: number; z: number };

function toScreen(point: Vector3, camera: PerspectiveCamera) {
  point.project(camera);
  return new Vector2(point.x * camera.aspect, point.y);
}

function distanceToSegment(p: Vector2, a: Vector2, b: Vector2) {
  const ab = b.clone().sub(a);
  const t = MathUtils.clamp(p.clone().sub(a).dot(ab) / ab.lengthSq(), 0, 1);
  return a.clone().addScaledVector(ab, t).distanceTo(p);
}

export function nearestRod(pointer: Vector2, camera: PerspectiveCamera, rods: RodSpot[], height: number, reach: number) {
  const tap = new Vector2(pointer.x * camera.aspect, pointer.y);
  let nearest: number | null = null;
  let nearestDistance = Infinity;
  rods.forEach(({ x, z }, i) => {
    const base = toScreen(new Vector3(x, 0, z), camera);
    const top = toScreen(new Vector3(x, height, z), camera);
    const radius = toScreen(new Vector3(x + reach, 0, z), camera).distanceTo(base);
    const distance = distanceToSegment(tap, base, top);
    if (distance <= radius && distance < nearestDistance) {
      nearest = i;
      nearestDistance = distance;
    }
  });
  return nearest;
}
