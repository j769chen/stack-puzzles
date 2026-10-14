import { create } from '@react-three/test-renderer';
import { Color, type Mesh, type MeshStandardMaterial, type Object3D } from 'three';
import { theme } from '../../theme';
import type { Move } from '../useHistory';
import { HanoiBoard } from './HanoiBoard';
import { type HanoiState, createHanoi, moveDisk } from './logic';

jest.mock('../../three/Board', () => ({ Board: ({ children }: { children: unknown }) => children }));

type Props = { state: HanoiState; selected?: number | null; hint?: Move | null; onPress?: (peg: number) => void };

const board = ({ state, selected = null, hint = null, onPress = jest.fn() }: Props) => (
  <HanoiBoard state={state} disks={3} selected={selected} hint={hint} onPress={onPress} />
);

function disk(scene: Object3D, size: number) {
  let found: Object3D | undefined;
  scene.traverse((o) => {
    const mat = (o as Mesh).material as MeshStandardMaterial | undefined;
    if ((o as Mesh).geometry?.type === 'LatheGeometry' && mat?.color.equals(new Color(theme.disks[size - 1]))) found = o.parent!;
  });
  return found!;
}

const settle = (renderer: Awaited<ReturnType<typeof create>>) => renderer.advanceFrames(200, 0.016);

describe('HanoiBoard', () => {
  it('stacks disks on the left peg, largest at the bottom', async () => {
    const renderer = await create(board({ state: createHanoi(3) }));
    const scene = renderer.scene.instance;
    const ys = [3, 2, 1].map((size) => disk(scene, size).position.y);
    expect(ys[0]).toBe(0);
    expect(ys[1]).toBeGreaterThan(ys[0]);
    expect(ys[2]).toBeGreaterThan(ys[1]);
    expect(disk(scene, 1).position.x).toBeLessThan(0);
  });

  it('keeps the same disk object when it moves to another peg, so it animates instead of jumping', async () => {
    const start = createHanoi(3);
    const renderer = await create(board({ state: start }));
    const scene = renderer.scene.instance;
    const smallest = disk(scene, 1);

    await renderer.update(board({ state: moveDisk(start, 0, 2) }));
    expect(disk(scene, 1)).toBe(smallest);
    await renderer.advanceFrames(1, 0.016);
    expect(smallest.position.x).toBeLessThan(0);

    await settle(renderer);
    expect(smallest.position.x).toBeGreaterThan(0);
    expect(smallest.position.y).toBe(0);
  });

  it('lifts the selected top disk', async () => {
    const renderer = await create(board({ state: createHanoi(3), selected: 0 }));
    const scene = renderer.scene.instance;
    expect(disk(scene, 1).position.y).toBeGreaterThan(disk(scene, 3).position.y + 1);
    expect(disk(scene, 2).position.y).toBeLessThan(1);
  });

  it('highlights the hinted pegs and nudges the disk to move', async () => {
    const plain = await create(board({ state: createHanoi(3) }));
    const hinted = await create(board({ state: createHanoi(3), hint: [0, 2] }));
    expect(disk(hinted.scene.instance, 1).position.y).toBeGreaterThan(disk(plain.scene.instance, 1).position.y);

    const poleColor = (i: number) =>
      ((hinted.scene.allChildren.filter((c) => c.type === 'Group' && c.allChildren.length === 4)[i].children[0].instance as Mesh)
        .material as MeshStandardMaterial).color;
    expect(poleColor(0).equals(new Color(theme.hintFrom))).toBe(true);
    expect(poleColor(1).equals(new Color(theme.pole))).toBe(true);
    expect(poleColor(2).equals(new Color(theme.hintTo))).toBe(true);
  });

  it('reports which peg was tapped', async () => {
    const onPress = jest.fn();
    const renderer = await create(board({ state: createHanoi(3), onPress }));
    const rods = renderer.scene.allChildren.filter((c) => c.type === 'Group' && c.allChildren.length === 4);
    await renderer.fireEvent(rods[1].children[3], 'click');
    expect(onPress).toHaveBeenCalledWith(1);
  });
});
