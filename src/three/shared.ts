import { BoxGeometry, CircleGeometry, CylinderGeometry, MeshStandardMaterial, SphereGeometry } from 'three';

const POLE_RADIUS = 0.11;

const resources = new Set<{ dispose(): void }>();

export function shared<T extends { dispose(): void }>(resource: T): T {
  resources.add(resource);
  return resource;
}

export function disposeShared() {
  resources.forEach((resource) => resource.dispose());
}

export const geometries = {
  pole: shared(new CylinderGeometry(POLE_RADIUS, 0.13, 1, 20).translate(0, 0.5, 0)),
  poleCap: shared(new SphereGeometry(POLE_RADIUS, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2)),
  pad: shared(new CircleGeometry(1, 40)),
  plank: shared(new BoxGeometry(1, 0.3, 1)),
};

const materials = new Map<string, MeshStandardMaterial>();

export function standardMaterial(color: string, roughness: number): MeshStandardMaterial {
  const key = `${color}/${roughness}`;
  let material = materials.get(key);
  if (!material) {
    material = shared(new MeshStandardMaterial({ color, roughness }));
    materials.set(key, material);
  }
  return material;
}
