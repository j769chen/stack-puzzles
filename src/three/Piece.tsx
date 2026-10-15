import { useFrame, useThree } from '@react-three/fiber/native';
import { type ReactNode, useLayoutEffect, useRef } from 'react';
import { type Group, Vector3 } from 'three';

type Props = { x: number; y: number; z: number; liftY: number; children: ReactNode };

const MAX_SPEED = 20;
const MIN_SPEED = 3;
const EASE = 9;

export function Piece({ x, y, z, liftY, children }: Props) {
  const ref = useRef<Group>(null);
  const path = useRef<Vector3[]>([]);
  const placed = useRef(false);
  const invalidate = useThree((s) => s.invalidate);

  useLayoutEffect(() => {
    const pos = ref.current!.position;
    const goal = new Vector3(x, y, z);
    if (!placed.current) {
      placed.current = true;
      pos.copy(goal);
    } else if (Math.hypot(pos.x - x, pos.z - z) < 1e-3) {
      path.current = [goal];
    } else {
      const top = Math.max(pos.y, liftY);
      path.current = [new Vector3(pos.x, top, pos.z), new Vector3(x, top, z), goal];
    }
    invalidate();
  }, [x, y, z, liftY, invalidate]);

  useFrame((_, dt) => {
    const pos = ref.current?.position;
    if (!pos || !path.current.length) return;
    let remaining = pos.distanceTo(path.current[0]);
    for (let i = 1; i < path.current.length; i++) remaining += path.current[i - 1].distanceTo(path.current[i]);
    let step = Math.min(Math.max(remaining * EASE, MIN_SPEED), MAX_SPEED) * Math.min(dt, 0.05);
    while (step > 0 && path.current.length) {
      const next = path.current[0];
      const d = pos.distanceTo(next);
      if (d <= step) {
        pos.copy(next);
        path.current.shift();
        step -= d;
      } else {
        pos.lerp(next, step / d);
        step = 0;
      }
    }
    if (path.current.length) invalidate();
  });

  return <group ref={ref}>{children}</group>;
}
