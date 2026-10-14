import { useMemo } from 'react';
import { Vector2 } from 'three';
import { Board } from '../../three/Board';
import { Piece } from '../../three/Piece';
import { Plank, Rod } from '../../three/Rod';
import { theme } from '../../theme';
import type { Move } from '../useHistory';
import type { HanoiState } from './logic';

const SPACING = 3.3;
const DISK_H = 0.44;
const HOLE = 0.17;
const HINT_NUDGE = 0.35;

type Props = {
  state: HanoiState;
  disks: number;
  selected: number | null;
  hint: Move | null;
  onPress: (peg: number) => void;
};

export function HanoiBoard({ state, disks, selected, hint, onPress }: Props) {
  const maxR = SPACING * 0.45;
  const minR = 0.5;
  const radius = (size: number) => minR + ((maxR - minR) * (size - 1)) / Math.max(disks - 1, 1);
  const poleH = disks * DISK_H + 0.6;
  const liftY = poleH + 0.35;
  const width = SPACING * 3 + 0.4;
  const depth = maxR * 2 + 0.6;

  return (
    <Board width={width} height={liftY + DISK_H} depth={depth}>
      <Plank width={width} depth={depth} />
      {state.flatMap((peg, i) => {
        const x = (i - 1) * SPACING;
        const hintColor = hint?.[0] === i ? theme.hintFrom : hint?.[1] === i ? theme.hintTo : undefined;
        return [
          <Rod
            key={`rod${i}`}
            x={x}
            z={0}
            height={poleH}
            padRadius={maxR + 0.08}
            hitRadius={SPACING / 2}
            hitHeight={liftY + DISK_H * 2}
            poleColor={hintColor}
            padColor={hintColor}
            onPress={() => onPress(i)}
          />,
          ...peg.map((size, k) => {
            const top = k === peg.length - 1;
            const lifted = selected === i && top;
            const nudge = hint?.[0] === i && top ? HINT_NUDGE : 0;
            return (
              <Piece key={size} x={x} y={lifted ? liftY : k * DISK_H + nudge} z={0} liftY={liftY}>
                <Disk radius={radius(size)} color={theme.disks[(size - 1) % theme.disks.length]} />
              </Piece>
            );
          }),
        ];
      })}
    </Board>
  );
}

function Disk({ radius, color }: { radius: number; color: string }) {
  const profile = useMemo(() => ringProfile(HOLE, radius, DISK_H - 0.03, 0.1), [radius]);
  return (
    <mesh position-y={0.015} castShadow receiveShadow>
      <latheGeometry args={[profile, 56]} />
      <meshStandardMaterial color={color} roughness={0.35} />
    </mesh>
  );
}

function ringProfile(inner: number, outer: number, height: number, round: number): Vector2[] {
  const corners: [number, number, number][] = [
    [outer - round, round, -Math.PI / 2],
    [outer - round, height - round, 0],
    [inner + round, height - round, Math.PI / 2],
    [inner + round, round, Math.PI],
  ];
  const points: Vector2[] = [];
  for (const [cx, cy, start] of corners) {
    for (let s = 0; s <= 6; s++) {
      const a = start + (s / 6) * (Math.PI / 2);
      points.push(new Vector2(cx + Math.cos(a) * round, cy + Math.sin(a) * round));
    }
  }
  points.push(points[0].clone());
  return points;
}
