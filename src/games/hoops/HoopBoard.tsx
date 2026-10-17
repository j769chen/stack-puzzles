import { memo } from 'react';
import { TorusGeometry } from 'three';
import { Board } from '../../three/Board';
import { Piece } from '../../three/Piece';
import { Plank, Rod } from '../../three/Rod';
import { usePicker } from '../../three/RodPicker';
import { patternMaterial } from '../../three/patterns';
import { shared, standardMaterial } from '../../three/shared';
import { useSettings } from '../../settings';
import { theme } from '../../theme';
import { rodRows } from './layout';
import { type Rods, isRodComplete } from './logic';

const SPACING = 2.1;
const ROW_GAP = 4;
const TUBE = 0.27;
const RING_R = 0.62;
const RING_H = TUBE * 2;
const PLANK_DEPTH = 2.2;
const SMALLEST_R = 0.4;
const LARGEST_R = 0.74;
const RING_GEOMETRY = shared(new TorusGeometry(RING_R, TUBE, 14, 36));
const sizedGeometries = new Map<string, TorusGeometry>();

function ringGeometry(size: number, sizes: number) {
  const key = `${size}/${sizes}`;
  let geometry = sizedGeometries.get(key);
  if (!geometry) {
    geometry = shared(new TorusGeometry(SMALLEST_R + ((LARGEST_R - SMALLEST_R) * size) / (sizes - 1), TUBE, 14, 36));
    sizedGeometries.set(key, geometry);
  }
  return geometry;
}

type Props = {
  rods: Rods;
  capacity: number;
  sizes?: number;
  isRodComplete?: (rod: number[]) => boolean;
  ids: number[][];
  selected: number | null;
  onPress: (rod: number) => void;
  onDrop: (rod: number) => void;
};

function boardLayout(count: number, capacity: number) {
  const poleHeight = capacity * RING_H + 0.35;
  const liftY = poleHeight + 0.35;
  const rowSizes = rodRows(count);
  const rows = rowSizes.length;
  const cols = rowSizes[0]!;
  const rowZ = rowSizes.map((_, r) => (r - (rows - 1) / 2) * ROW_GAP);
  const positions = Array.from({ length: count }, (_, i) => {
    const r = Math.floor(i / cols);
    return { x: ((i % cols) - (rowSizes[r]! - 1) / 2) * SPACING, z: rowZ[r]! };
  });
  const size = {
    width: cols * SPACING + 0.3,
    height: liftY + RING_H,
    depth: (rows - 1) * ROW_GAP + PLANK_DEPTH,
  };
  return { poleHeight, liftY, rowSizes, rowZ, positions, size, tilt: rows === 1 ? 0.55 : 1 };
}

export function HoopBoard({ rods, capacity, sizes, isRodComplete: complete, ids, selected, onPress, onDrop }: Props) {
  const done = complete ?? ((rod: number[]) => isRodComplete(rod, capacity));
  const { patterns } = useSettings();
  const { poleHeight, liftY, rowSizes, rowZ, positions, size, tilt } = boardLayout(rods.length, capacity);
  const { picker, spotOf } = usePicker({
    rods: positions,
    stacks: rods.map((rod) => rod.length),
    piece: { radius: (sizes ? LARGEST_R : RING_R) + TUBE, height: RING_H },
    liftY,
    reach: SPACING / 2,
    selected,
    onPick: onPress,
    onDrop,
  });

  return (
    <Board {...size} tilt={tilt}>
      {rowZ.map((z, r) => (
        <Plank key={`plank${r}`} width={rowSizes[r]! * SPACING + 0.3} depth={PLANK_DEPTH} z={z} />
      ))}
      {picker}
      {rods.flatMap((rod, i) => {
        const { x, z } = positions[i]!;
        const top = rod.length - 1;
        return [
          <Rod
            key={`rod${i}`}
            x={x}
            z={z}
            height={poleHeight}
            padRadius={SPACING / 2 - 0.04}
            poleColor={done(rod) ? theme.done : undefined}
          />,
          ...rod.map((ring, k) => {
            const lifted = k === top && selected === i;
            const spot = spotOf(i, lifted);
            return (
              <Ring
                key={ids[i]![k]}
                x={spot.x}
                y={lifted ? liftY : k * RING_H}
                z={spot.z}
                liftY={liftY}
                color={sizes ? Math.floor(ring / sizes) : ring}
                patterned={patterns}
                geometry={sizes ? ringGeometry(ring % sizes, sizes) : RING_GEOMETRY}
              />
            );
          }),
        ];
      })}
    </Board>
  );
}

type RingProps = {
  x: number;
  y: number;
  z: number;
  liftY: number;
  color: number;
  patterned: boolean;
  geometry: TorusGeometry;
};

const Ring = memo(function Ring({ x, y, z, liftY, color, patterned, geometry }: RingProps) {
  return (
    <Piece x={x} y={y} z={z} liftY={liftY}>
      <mesh
        geometry={geometry}
        material={patterned ? patternMaterial(color) : standardMaterial(theme.rings[color]!, 0.3)}
        position-y={TUBE}
        rotation-x={Math.PI / 2}
        castShadow
        receiveShadow
      />
    </Piece>
  );
});
