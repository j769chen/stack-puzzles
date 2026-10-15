import { useFrame, useThree } from '@react-three/fiber/native';
import { type ReactNode, useLayoutEffect, useRef } from 'react';
import { type Group, Vector3 } from 'three';

type Props = { x: number; y: number; z: number; liftY: number; children: ReactNode };

type Tween = { points: Vector3[]; length: number; duration: number; elapsed: number };

const MIN_DURATION = 0.2;
const MAX_DURATION = 0.5;
const SPEED = 30;
const FIRST_STEP = 1 / 60;
const MAX_STEP = 0.1;

function createTween(points: Vector3[]): Tween {
  let length = 0;
  for (let i = 1; i < points.length; i++) length += points[i - 1].distanceTo(points[i]);
  return { points, length, duration: Math.min(MIN_DURATION + length / SPEED, MAX_DURATION), elapsed: 0 };
}

function placeAlong({ points }: Tween, distance: number, out: Vector3) {
  for (let i = 1; i < points.length; i++) {
    const d = points[i - 1].distanceTo(points[i]);
    if (distance < d) {
      out.lerpVectors(points[i - 1], points[i], distance / d);
      return;
    }
    distance -= d;
  }
  out.copy(points[points.length - 1]);
}

const easeInOut = (u: number) => (1 - Math.cos(Math.PI * u)) / 2;

export function Piece({ x, y, z, liftY, children }: Props) {
  const ref = useRef<Group>(null);
  const tween = useRef<Tween | null>(null);
  const placed = useRef(false);
  const invalidate = useThree((s) => s.invalidate);

  useLayoutEffect(() => {
    const pos = ref.current!.position;
    const goal = new Vector3(x, y, z);
    if (!placed.current) {
      placed.current = true;
      pos.copy(goal);
    } else if (Math.hypot(pos.x - x, pos.z - z) < 1e-3) {
      tween.current = createTween([pos.clone(), goal]);
    } else {
      const top = Math.max(pos.y, liftY);
      tween.current = createTween([pos.clone(), new Vector3(pos.x, top, pos.z), new Vector3(x, top, z), goal]);
    }
    invalidate();
  }, [x, y, z, liftY, invalidate]);

  useFrame((_, dt) => {
    const pos = ref.current?.position;
    const t = tween.current;
    if (!pos || !t) return;
    t.elapsed += Math.min(dt, t.elapsed === 0 ? FIRST_STEP : MAX_STEP);
    const u = t.elapsed / t.duration;
    if (u < 1) {
      placeAlong(t, t.length * easeInOut(u), pos);
      invalidate();
    } else {
      pos.copy(t.points[t.points.length - 1]);
      tween.current = null;
    }
  });

  return <group ref={ref}>{children}</group>;
}
