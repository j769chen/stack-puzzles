import type { ThreeEvent } from '@react-three/fiber/native';
import { useRef } from 'react';
import { type Intersection, type Mesh, type PerspectiveCamera, type Raycaster, Vector3 } from 'three';
import { type RodSpot, nearestRod } from './pick';

type Props = {
  rods: RodSpot[];
  height: number;
  reach: number;
  selected: number | null;
  onPick: (rod: number) => void;
  onDrop: (rod: number) => void;
  onHover: (rod: number | null) => void;
};

function catchEveryRay(this: Mesh, _raycaster: Raycaster, hits: Intersection[]) {
  hits.push({ distance: 0, point: new Vector3(), object: this });
}

export function RodPicker({ rods, height, reach, selected, onPick, onDrop, onHover }: Props) {
  const dragFrom = useRef<number | null>(null);
  const hovered = useRef<number | null>(null);
  const rodAt = (e: ThreeEvent<PointerEvent>) => nearestRod(e.pointer, e.camera as PerspectiveCamera, rods, height, reach);

  const hover = (rod: number | null) => {
    if (hovered.current === rod) return;
    hovered.current = rod;
    onHover(rod);
  };

  const down = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    const rod = rodAt(e);
    if (rod === null) return;
    dragFrom.current = selected === null ? rod : null;
    onPick(rod);
  };

  const move = (e: ThreeEvent<PointerEvent>) => {
    if (dragFrom.current !== null && selected === dragFrom.current) hover(rodAt(e));
  };

  const up = (e: ThreeEvent<PointerEvent>) => {
    const from = dragFrom.current;
    dragFrom.current = null;
    hover(null);
    if (from === null || selected !== from) return;
    const rod = rodAt(e);
    if (rod !== null && rod !== from) onDrop(rod);
  };

  const cancel = () => {
    dragFrom.current = null;
    hover(null);
  };

  return (
    <mesh
      visible={false}
      raycast={catchEveryRay}
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={cancel}
    />
  );
}
