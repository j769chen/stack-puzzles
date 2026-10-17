import { act, create } from '@react-three/test-renderer';
import { Color, type Mesh, type MeshStandardMaterial, type Object3D, PerspectiveCamera, type TorusGeometry, Vector2, Vector3 } from 'three';
import { updateSettings } from '../../settings';
import { Board } from '../../three/Board';
import { patternMaterial } from '../../three/patterns';
import { theme } from '../../theme';
import { HoopBoard } from './HoopBoard';
import type { Rods } from './logic';

jest.mock('../../three/Board', () => ({ Board: jest.fn(({ children }: { children: unknown }) => children) }));

type Props = {
  rods: Rods;
  capacity?: number;
  ids?: number[][];
  selected?: number | null;
  onPress?: (rod: number) => void;
  onDrop?: (rod: number) => void;
};

function idsFor(rods: Rods) {
  let next = 0;
  return rods.map((rod) => rod.map(() => next++));
}

const board = ({ rods, capacity = 4, ids = idsFor(rods), selected = null, onPress = jest.fn(), onDrop = jest.fn() }: Props) => (
  <HoopBoard rods={rods} capacity={capacity} ids={ids} selected={selected} onPress={onPress} onDrop={onDrop} />
);

const renderBoard = (props: Props) => create(board(props));
type Renderer = Awaited<ReturnType<typeof renderBoard>>;

const rings = (r: Renderer) => {
  const found: Object3D[] = [];
  r.scene.instance.traverse((o) => {
    if ((o as Mesh).geometry?.type === 'TorusGeometry') found.push(o.parent!);
  });
  return found;
};
const rodGroups = (r: Renderer) => r.scene.allChildren.filter((c) => c.type === 'Group' && c.allChildren.length === 3);
const planks = (r: Renderer) =>
  r.scene.children.filter((c) => (c.instance as Mesh).geometry?.type === 'BoxGeometry');
const poleColor = (r: Renderer, i: number) =>
  ((rodGroups(r)[i]!.children[0]!.instance as Mesh).material as MeshStandardMaterial).color;

const tapCamera = new PerspectiveCamera(32, 1);
tapCamera.position.set(0, 8, 16);
tapCamera.lookAt(0, 1, 0);
tapCamera.updateMatrixWorld();

function tapAt(position: Vector3) {
  const p = position.clone().setY(1).project(tapCamera);
  return { pointer: new Vector2(p.x, p.y), camera: tapCamera, stopPropagation: jest.fn() };
}

describe('HoopBoard', () => {
  it('draws sized rings from smallest to largest, colored by ring', async () => {
    const r = await create(
      <HoopBoard
        rods={[[1 * 3 + 2, 0 * 3 + 1, 2 * 3 + 0], []]}
        capacity={3}
        sizes={3}
        isRodComplete={() => false}
        ids={[[0, 1, 2], []]}
        selected={null}
        onPress={jest.fn()}
        onDrop={jest.fn()}
      />,
    );
    const meshes = rings(r).map((ring) => ring.children[0] as Mesh);
    const radii = meshes.map((mesh) => (mesh.geometry as unknown as { parameters: { radius: number } }).parameters.radius);
    expect(radii[0]).toBeGreaterThan(radii[1]!);
    expect(radii[1]).toBeGreaterThan(radii[2]!);
    const colors = meshes.map((mesh) => (mesh.material as MeshStandardMaterial).color);
    expect(colors).toEqual([new Color(theme.rings[1]), new Color(theme.rings[0]), new Color(theme.rings[2])]);
  });

  it('gives each ring its color pattern when color-blind patterns are on', async () => {
    await act(async () => updateSettings({ patterns: true }));
    const r = await renderBoard({ rods: [[0, 5], [9]] });
    const materials = rings(r).map((ring) => (ring.children[0] as Mesh).material);
    expect(materials).toEqual([patternMaterial(0), patternMaterial(5), patternMaterial(9)]);
    await act(async () => updateSettings({ patterns: false }));
    const plain = await renderBoard({ rods: [[0]] });
    expect(((rings(plain)[0]!.children[0] as Mesh).material as MeshStandardMaterial).map).toBeNull();
  });

  it('marks a rod done by the given rule', async () => {
    const r = await create(
      <HoopBoard rods={[[5, 4, 3], []]} capacity={3} sizes={3} isRodComplete={(rod) => rod.length === 3} ids={[[0, 1, 2], []]} selected={null} onPress={jest.fn()} onDrop={jest.fn()} />,
    );
    expect(poleColor(r, 0)).toEqual(new Color(theme.done));
    expect(poleColor(r, 1)).not.toEqual(new Color(theme.done));
  });

  it.each([
    [5, 1],
    [8, 2],
    [12, 3],
  ])('lays out %i rods in %i rows', async (count, rows) => {
    const r = await renderBoard({ rods: Array.from({ length: count }, () => []) });
    expect(rodGroups(r)).toHaveLength(count);
    expect(planks(r)).toHaveLength(rows);
    const spots = new Set(rodGroups(r).map((g) => g.instance.position.toArray().join()));
    expect(spots.size).toBe(count);
  });

  it.each([5, 7, 12])('centers every row of %i rods under the camera', async (count) => {
    const r = await renderBoard({ rods: Array.from({ length: count }, () => []) });
    const byRow = new Map<number, number[]>();
    for (const g of rodGroups(r)) {
      const { x, z } = g.instance.position;
      byRow.set(z, [...(byRow.get(z) ?? []), x]);
    }
    for (const xs of byRow.values()) expect(xs.reduce((a, b) => a + b, 0)).toBeCloseTo(0);
    const rowZs = [...byRow.keys()];
    expect(rowZs.reduce((a, b) => a + b, 0)).toBeCloseTo(0);
  });

  it('keeps the same ring object when it moves to another rod', async () => {
    const before: Rods = [[0, 1, 1], [1], []];
    const ids = idsFor(before);
    const r = await renderBoard({ rods: before, ids });
    const [, below, top] = rings(r);

    await r.update(board({ rods: [[0, 1], [1, 1], []], ids: [[0, 1], [3, 2], []] }));
    expect(rings(r)).toEqual(expect.arrayContaining([below, top]));
    await r.advanceFrames(200, 0.016);
    expect(top!.position.x).toBe(rodGroups(r)[1]!.instance.position.x);
    expect(below!.position.x).toBe(rodGroups(r)[0]!.instance.position.x);
  });

  it('lifts only the top ring of the selected rod, even when the ring below matches', async () => {
    const plain = await renderBoard({ rods: [[0, 1, 1], []] });
    const selected = await renderBoard({ rods: [[0, 1, 1], []], selected: 0 });
    const ys = (r: Renderer) => rings(r).map((o) => o.position.y);
    expect(ys(selected).slice(0, 2)).toEqual(ys(plain).slice(0, 2));
    expect(ys(selected)[2]).toBeGreaterThan(ys(plain)[2]! + 1);
  });

  it('frames the board up to the top of a lifted ring', async () => {
    const r = await renderBoard({ rods: [[0, 1, 0, 1], []], selected: 0 });
    const lifted = rings(r).at(-1)!;
    const { tube } = ((lifted.children[0] as Mesh).geometry as TorusGeometry).parameters;
    expect(jest.mocked(Board).mock.calls.at(-1)![0].height).toBeCloseTo(lifted.position.y + 2 * tube);
  });

  it('colors complete rods', async () => {
    const r = await renderBoard({ rods: [[2, 2, 2, 2], [0, 1], [1]] });
    expect(poleColor(r, 0).equals(new Color(theme.done))).toBe(true);
    expect(poleColor(r, 1).equals(new Color(theme.pole))).toBe(true);
    expect(poleColor(r, 2).equals(new Color(theme.pole))).toBe(true);
  });

  it('grows the poles and marks completion for taller rods', async () => {
    const short = await renderBoard({ rods: [[1, 1, 1, 1], []] });
    const tall = await renderBoard({ rods: [[1, 1, 1, 1], []], capacity: 6 });
    const poleHeight = (r: Renderer) => rodGroups(r)[0]!.children[0]!.instance.scale.y;
    expect(poleHeight(tall)).toBeGreaterThan(poleHeight(short));
    expect(poleColor(short, 0).equals(new Color(theme.done))).toBe(true);
    expect(poleColor(tall, 0).equals(new Color(theme.pole))).toBe(true);
  });

  it('paints rings with the ring palette', async () => {
    const r = await renderBoard({ rods: [[4]] });
    const mat = (rings(r)[0]!.children[0] as Mesh).material as MeshStandardMaterial;
    expect(mat.color.equals(new Color(theme.rings[4]))).toBe(true);
  });

  it('shares one geometry across all rings and one material per color', async () => {
    const r = await renderBoard({ rods: [[0, 1, 0, 1], [1, 0, 1, 0], [2, 2], [2, 2]] });
    const meshes = rings(r).map((o) => o.children[0] as Mesh);
    expect(new Set(meshes.map((m) => m.geometry)).size).toBe(1);
    expect(new Set(meshes.map((m) => m.material)).size).toBe(3);
  });

  it('reports which rod was tapped', async () => {
    const onPress = jest.fn();
    const r = await renderBoard({ rods: [[], [], []], onPress });
    const picker = r.scene.children.find((c) => c.type === 'Mesh' && !c.instance.visible)!;
    await r.fireEvent(picker, 'pointerDown', tapAt(rodGroups(r)[2]!.instance.position));
    expect(onPress).toHaveBeenCalledWith(2);
  });

  it('carries a dragged ring over the rod under the finger and drops it there', async () => {
    const onDrop = jest.fn();
    const rods: Rods = [[0, 1], [1], []];
    const r = await renderBoard({ rods, onDrop });
    const picker = r.scene.children.find((c) => c.type === 'Mesh' && !c.instance.visible)!;
    const spot = (i: number) => rodGroups(r)[i]!.instance.position;
    await r.fireEvent(picker, 'pointerDown', tapAt(spot(0)));
    await r.update(board({ rods, selected: 0, onDrop }));
    await r.fireEvent(picker, 'pointerMove', tapAt(spot(2)));
    await r.advanceFrames(200, 0.016);
    const top = rings(r)[1]!;
    expect(top.position.x).toBe(spot(2).x);
    await r.fireEvent(picker, 'pointerUp', tapAt(spot(2)));
    await act(() => new Promise((resolve) => setTimeout(resolve, 0)));
    expect(onDrop).toHaveBeenCalledWith(2);
    await r.advanceFrames(200, 0.016);
    expect(top.position.x).toBe(spot(0).x);
  });
});
