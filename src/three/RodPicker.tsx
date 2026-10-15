import type { ThreeEvent } from '@react-three/fiber/native';
import { type Intersection, type Mesh, type PerspectiveCamera, type Raycaster, Vector3 } from 'three';
import { type RodSpot, nearestRod } from './pick';

type Props = { rods: RodSpot[]; height: number; reach: number; onPick: (rod: number) => void };

function catchEveryRay(this: Mesh, _raycaster: Raycaster, hits: Intersection[]) {
  hits.push({ distance: 0, point: new Vector3(), object: this });
}

export function RodPicker({ rods, height, reach, onPick }: Props) {
  const pick = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    const rod = nearestRod(e.pointer, e.camera as PerspectiveCamera, rods, height, reach);
    if (rod !== null) onPick(rod);
  };

  return <mesh visible={false} raycast={catchEveryRay} onPointerDown={pick} />;
}
