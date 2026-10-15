import { memo, useMemo } from 'react';
import { Vector2 } from 'three';
import { Board } from '../../three/Board';
import { Piece } from '../../three/Piece';
import { Plank, Rod } from '../../three/Rod';
import { RodPicker } from '../../three/RodPicker';
import { standardMaterial } from '../../three/shared';
import { theme } from '../../theme';
import type { HanoiState } from './logic';

const SPACING = 3.3;
const DISK_H = 0.44;
const HOLE = 0.17;
const PEGS = [-SPACING, 0, SPACING].map((x) => ({ x, z: 0 }));

type Props = {
  state: HanoiState;
  disks: number;
  selected: number | null;
  onPress: (peg: number) => void;
};

export function HanoiBoard({ state, disks, selected, onPress }: Props) {
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
      <RodPicker rods={PEGS} height={liftY + DISK_H} reach={SPACING / 2} onPick={onPress} />
      {state.flatMap((peg, i) => {
        const { x } = PEGS[i];
        return [
          <Rod
            key={`rod${i}`}
            x={x}
            z={0}
            height={poleH}
            padRadius={maxR + 0.08}
          />,
          ...peg.map((size, k) => {
            const lifted = selected === i && k === peg.length - 1;
            return (
              <Disk
                key={size}
                x={x}
                y={lifted ? liftY : k * DISK_H}
                liftY={liftY}
                radius={radius(size)}
                color={theme.disks[(size - 1) % theme.disks.length]}
              />
            );
          }),
        ];
      })}
    </Board>
  );
}

type DiskProps = { x: number; y: number; liftY: number; radius: number; color: string };

const Disk = memo(function Disk({ x, y, liftY, radius, color }: DiskProps) {
  const profile = useMemo(() => ringProfile(HOLE, radius, DISK_H - 0.03, 0.1), [radius]);
  return (
    <Piece x={x} y={y} z={0} liftY={liftY}>
      <mesh material={standardMaterial(color, 0.35)} position-y={0.015} castShadow receiveShadow>
        <latheGeometry args={[profile, 40]} />
      </mesh>
    </Piece>
  );
});

function ringProfile(inner: number, outer: number, height: number, round: number): Vector2[] {
  const corners: [number, number, number][] = [
    [outer - round, round, -Math.PI / 2],
    [outer - round, height - round, 0],
    [inner + round, height - round, Math.PI / 2],
    [inner + round, round, Math.PI],
  ];
  const points: Vector2[] = [];
  for (const [cx, cy, start] of corners) {
    for (let s = 0; s <= 4; s++) {
      const a = start + (s / 4) * (Math.PI / 2);
      points.push(new Vector2(cx + Math.cos(a) * round, cy + Math.sin(a) * round));
    }
  }
  points.push(points[0].clone());
  return points;
}
