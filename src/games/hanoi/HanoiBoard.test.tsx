import { act, create } from '@react-three/test-renderer';
import { Color, type Mesh, type MeshStandardMaterial, type Object3D, PerspectiveCamera, Vector2, Vector3 } from 'three';
import { theme } from '../../theme';
import { HanoiBoard } from './HanoiBoard';
import { type HanoiState, createHanoi, moveDisk } from './logic';

jest.mock('../../three/Board', () => ({ Board: ({ children }: { children: unknown }) => children }));

type Props = { state: HanoiState; selected?: number | null; onPress?: (peg: number) => void; onDrop?: (peg: number) => void };

const board = ({ state, selected = null, onPress = jest.fn(), onDrop = jest.fn() }: Props) => (
  <HanoiBoard state={state} disks={3} selected={selected} onPress={onPress} onDrop={onDrop} />
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

const tapCamera = new PerspectiveCamera(32, 1);
tapCamera.position.set(0, 8, 16);
tapCamera.lookAt(0, 1, 0);
tapCamera.updateMatrixWorld();

function tapAt(position: Vector3) {
  const p = position.clone().setY(1).project(tapCamera);
  return { pointer: new Vector2(p.x, p.y), camera: tapCamera, stopPropagation: jest.fn() };
}

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

  it('reports which peg was tapped', async () => {
    const onPress = jest.fn();
    const renderer = await create(board({ state: createHanoi(3), onPress }));
    const rods = renderer.scene.allChildren.filter((c) => c.type === 'Group' && c.allChildren.length === 3);
    const picker = renderer.scene.children.find((c) => c.type === 'Mesh' && !c.instance.visible)!;
    await renderer.fireEvent(picker, 'pointerDown', tapAt(rods[1].instance.position));
    expect(onPress).toHaveBeenCalledWith(1);
  });

  it('carries a dragged disk over the peg under the finger and drops it there', async () => {
    const onDrop = jest.fn();
    const state = createHanoi(3);
    const renderer = await create(board({ state, onDrop }));
    const rods = renderer.scene.allChildren.filter((c) => c.type === 'Group' && c.allChildren.length === 3);
    const picker = renderer.scene.children.find((c) => c.type === 'Mesh' && !c.instance.visible)!;
    await renderer.fireEvent(picker, 'pointerDown', tapAt(rods[0].instance.position));
    await renderer.update(board({ state, selected: 0, onDrop }));
    await renderer.fireEvent(picker, 'pointerMove', tapAt(rods[2].instance.position));
    await renderer.advanceFrames(200, 0.016);
    expect(disk(renderer.scene.instance, 1).position.x).toBe(rods[2].instance.position.x);
    await renderer.fireEvent(picker, 'pointerUp', tapAt(rods[2].instance.position));
    await act(() => new Promise((resolve) => setTimeout(resolve, 0)));
    expect(onDrop).toHaveBeenCalledWith(2);
  });
});
