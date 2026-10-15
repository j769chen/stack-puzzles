import { type PerspectiveCamera, Vector3 } from 'three';

export type BoardSize = { width: number; height: number; depth: number };

const MARGIN = 0.94;

export function fitCamera(camera: PerspectiveCamera, { width, height, depth }: BoardSize, tilt: number, aspect: number) {
  const center = new Vector3(0, height / 2, 0);
  const dir = new Vector3(0, Math.sin(tilt), Math.cos(tilt));
  const corners: Vector3[] = [];
  for (const x of [-width / 2, width / 2])
    for (const y of [0, height])
      for (const z of [-depth / 2, depth / 2]) corners.push(new Vector3(x, y, z));

  const place = (dist: number) => {
    camera.position.copy(center).addScaledVector(dir, dist);
    camera.lookAt(center);
    camera.updateMatrixWorld();
  };
  const fits = () =>
    corners.every((c) => {
      const p = c.clone().project(camera);
      return Math.abs(p.x) <= MARGIN && Math.abs(p.y) <= MARGIN && p.z < 1;
    });

  camera.aspect = aspect;
  camera.updateProjectionMatrix();
  let lo = 1;
  let hi = 300;
  for (let i = 0; i < 30; i++) {
    const mid = (lo + hi) / 2;
    place(mid);
    if (fits()) hi = mid;
    else lo = mid;
  }
  place(hi);
}
