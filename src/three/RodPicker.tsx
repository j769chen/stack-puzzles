import type { ThreeEvent } from '@react-three/fiber/native';
import { useContext, useRef, useState } from 'react';
import { type Intersection, type Mesh, type PerspectiveCamera, type Raycaster, Vector3 } from 'three';
import { type RodSpot, nearestRod } from './pick';
import { TouchCancelled } from './touch';

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
  const touchCancelled = useContext(TouchCancelled);
  const rodAt = (e: ThreeEvent<PointerEvent>) => nearestRod(e.pointer, e.camera as PerspectiveCamera, rods, height, reach);

  const hover = (rod: number | null) => {
    if (hovered.current === rod) return;
    hovered.current = rod;
    onHover(rod);
  };

  const down = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    hover(null);
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
    const rod = from !== null && selected === from ? rodAt(e) : null;
    if (rod === null || rod === from) {
      hover(null);
      return;
    }
    setTimeout(() => {
      hover(null);
      if (!touchCancelled.current) onDrop(rod);
    }, 0);
  };

  return (
    <mesh
      visible={false}
      raycast={catchEveryRay}
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
    />
  );
}

export function usePicker(props: Omit<Props, 'onHover'>) {
  const [hovered, setHovered] = useState<number | null>(null);
  return {
    picker: <RodPicker {...props} onHover={setHovered} />,
    spotOf: (rod: number, lifted: boolean) => props.rods[lifted && hovered !== null ? hovered : rod]!,
  };
}
