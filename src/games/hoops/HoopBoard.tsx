import { TorusGeometry } from 'three';
import { Board } from '../../three/Board';
import { Piece } from '../../three/Piece';
import { Plank, Rod } from '../../three/Rod';
import { standardMaterial } from '../../three/shared';
import { theme } from '../../theme';
import type { Move } from '../useHistory';
import { rodRows } from './layout';
import { type Rods, isRodComplete, topRun } from './logic';

const SPACING = 2.1;
const ROW_GAP = 3.2;
const TUBE = 0.27;
const RING_R = 0.62;
const RING_H = TUBE * 2;
const PLANK_DEPTH = 2.2;
const HINT_NUDGE = 0.35;
const RING_GEOMETRY = new TorusGeometry(RING_R, TUBE, 20, 48);

type Props = {
  rods: Rods;
  capacity: number;
  ids: number[][];
  selected: number | null;
  hint: Move | null;
  onPress: (rod: number) => void;
};

function boardLayout(count: number, capacity: number) {
  const poleHeight = capacity * RING_H + 0.35;
  const liftY = poleHeight + 0.35;
  const rowSizes = rodRows(count);
  const rows = rowSizes.length;
  const cols = rowSizes[0];
  const rowZ = rowSizes.map((_, r) => (r - (rows - 1) / 2) * ROW_GAP);
  const positions = Array.from({ length: count }, (_, i) => {
    const r = Math.floor(i / cols);
    return { x: ((i % cols) - (rowSizes[r] - 1) / 2) * SPACING, z: rowZ[r] };
  });
  const size = {
    width: cols * SPACING + 0.3,
    height: liftY + capacity * RING_H,
    depth: (rows - 1) * ROW_GAP + PLANK_DEPTH,
  };
  return { poleHeight, liftY, rowSizes, rowZ, positions, size, tilt: rows === 1 ? 0.55 : 0.85 };
}

export function HoopBoard({ rods, capacity, ids, selected, hint, onPress }: Props) {
  const { poleHeight, liftY, rowSizes, rowZ, positions, size, tilt } = boardLayout(rods.length, capacity);

  return (
    <Board {...size} tilt={tilt}>
      {rowZ.map((z, r) => (
        <Plank key={`plank${r}`} width={rowSizes[r] * SPACING + 0.3} depth={PLANK_DEPTH} z={z} />
      ))}
      {rods.flatMap((rod, i) => {
        const { x, z } = positions[i];
        const lift = selected === i ? topRun(rod) : 0;
        const firstLifted = rod.length - lift;
        const firstNudged = hint?.[0] === i ? rod.length - topRun(rod) : rod.length;
        const hintColor = hint?.[0] === i ? theme.hintFrom : hint?.[1] === i ? theme.hintTo : undefined;
        return [
          <Rod
            key={`rod${i}`}
            x={x}
            z={z}
            height={poleHeight}
            padRadius={SPACING / 2 - 0.04}
            hitRadius={SPACING / 2}
            hitHeight={poleHeight + 0.3}
            poleColor={isRodComplete(rod, capacity) ? theme.done : hintColor}
            padColor={hintColor}
            onPress={() => onPress(i)}
          />,
          ...rod.map((color, k) => (
            <Piece
              key={ids[i][k]}
              x={x}
              y={k >= firstLifted ? liftY + (k - firstLifted) * RING_H : k * RING_H + (k >= firstNudged ? HINT_NUDGE : 0)}
              z={z}
              liftY={liftY}
            >
              <mesh
                geometry={RING_GEOMETRY}
                material={standardMaterial(theme.rings[color], 0.3)}
                position-y={TUBE}
                rotation-x={Math.PI / 2}
                castShadow
                receiveShadow
              />
            </Piece>
          )),
        ];
      })}
    </Board>
  );
}
