import { type ThreeEvent, useThree } from '@react-three/fiber/native';
import { useContext, useRef, useState } from 'react';
import { type Intersection, type Mesh, type PerspectiveCamera, type Raycaster, type Vector2, Vector3 } from 'three';
import { type RodSpot, nearestRod, rodUnder } from './pick';
import { TouchCancelled } from './touch';

const DRAG_DISTANCE = 10;

type Props = {
  rods: RodSpot[];
  stacks: number[];
  piece: { radius: number; height: number };
  liftY: number;
  reach: number;
  selected: number | null;
  onPick: (rod: number) => void;
  onDrop: (rod: number) => void;
  onHover: (rod: number | null) => void;
};

type Drag = { from: number; pointerId: number; start: Vector2; moved: boolean };

function catchEveryRay(this: Mesh, _raycaster: Raycaster, hits: Intersection[]) {
  hits.push({ distance: 0, point: new Vector3(), object: this });
}

export function RodPicker({ rods, stacks, piece, liftY, reach, selected, onPick, onDrop, onHover }: Props) {
  const drag = useRef<Drag | null>(null);
  const hovered = useRef<number | null>(null);
  const touchCancelled = useContext(TouchCancelled);
  const size = useThree((s) => s.size);

  const rodAt = (e: ThreeEvent<PointerEvent>) => {
    const camera = e.camera as PerspectiveCamera;
    const columns = rods.map(({ x, z }, rod) => ({
      x,
      z,
      rod,
      bottom: 0,
      top: (stacks[rod]! - (rod === selected ? 1 : 0)) * piece.height,
    }));
    const lifted = hovered.current ?? selected;
    if (lifted !== null) columns.push({ ...rods[lifted]!, rod: lifted, bottom: liftY, top: liftY + piece.height });
    return rodUnder(e.pointer, camera, columns, piece.radius) ?? nearestRod(e.pointer, camera, rods, liftY + piece.height, reach);
  };

  const hover = (rod: number | null) => {
    if (hovered.current === rod) return;
    hovered.current = rod;
    onHover(rod);
  };

  const heldDrag = () => (drag.current?.from === selected ? drag.current : null);

  const byOtherFinger = (e: ThreeEvent<PointerEvent>) => {
    const held = heldDrag();
    return held !== null && held.pointerId !== e.pointerId;
  };

  const draggedFrom = (e: ThreeEvent<PointerEvent>) => {
    const held = heldDrag();
    if (held === null) return null;
    const travel = Math.hypot(((e.pointer.x - held.start.x) * size.width) / 2, ((e.pointer.y - held.start.y) * size.height) / 2);
    held.moved ||= travel >= DRAG_DISTANCE;
    return held.moved ? held.from : null;
  };

  const down = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    if (byOtherFinger(e)) return;
    hover(null);
    const rod = rodAt(e);
    if (rod === null) return;
    drag.current = selected === null ? { from: rod, pointerId: e.pointerId, start: e.pointer.clone(), moved: false } : null;
    onPick(rod);
  };

  const move = (e: ThreeEvent<PointerEvent>) => {
    if (!byOtherFinger(e) && draggedFrom(e) !== null) hover(rodAt(e));
  };

  const up = (e: ThreeEvent<PointerEvent>) => {
    if (byOtherFinger(e)) return;
    const from = draggedFrom(e);
    drag.current = null;
    const rod = from === null ? null : rodAt(e);
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
