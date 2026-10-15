import { BoxGeometry, CircleGeometry, CylinderGeometry, MeshBasicMaterial, MeshStandardMaterial, SphereGeometry } from 'three';

const POLE_RADIUS = 0.11;

export const geometries = {
  pole: new CylinderGeometry(POLE_RADIUS, 0.13, 1, 20).translate(0, 0.5, 0),
  poleCap: new SphereGeometry(POLE_RADIUS, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2),
  pad: new CircleGeometry(1, 40),
  hitArea: new CylinderGeometry(1, 1, 1, 12).translate(0, 0.5, 0),
  plank: new BoxGeometry(1, 0.3, 1),
};

export const hitAreaMaterial = new MeshBasicMaterial({ visible: false });

const materials = new Map<string, MeshStandardMaterial>();

export function standardMaterial(color: string, roughness: number): MeshStandardMaterial {
  const key = `${color}/${roughness}`;
  let material = materials.get(key);
  if (!material) {
    material = new MeshStandardMaterial({ color, roughness });
    materials.set(key, material);
  }
  return material;
}
