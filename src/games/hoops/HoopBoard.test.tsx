import { create } from '@react-three/test-renderer';
import { Color, type Mesh, type MeshStandardMaterial, type Object3D } from 'three';
import { theme } from '../../theme';
import type { Move } from '../useHistory';
import { HoopBoard } from './HoopBoard';
import type { Rods } from './logic';

jest.mock('../../three/Board', () => ({ Board: ({ children }: { children: unknown }) => children }));

type Props = { rods: Rods; capacity?: number; ids?: number[][]; selected?: number | null; hint?: Move | null; onPress?: (rod: number) => void };

function idsFor(rods: Rods) {
  let next = 0;
  return rods.map((rod) => rod.map(() => next++));
}

const board = ({ rods, capacity = 4, ids = idsFor(rods), selected = null, hint = null, onPress = jest.fn() }: Props) => (
  <HoopBoard rods={rods} capacity={capacity} ids={ids} selected={selected} hint={hint} onPress={onPress} />
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
const rodGroups = (r: Renderer) => r.scene.allChildren.filter((c) => c.type === 'Group' && c.allChildren.length === 4);
const planks = (r: Renderer) =>
  r.scene.children.filter((c) => (c.instance as Mesh).geometry?.type === 'BoxGeometry');
const poleColor = (r: Renderer, i: number) =>
  ((rodGroups(r)[i].children[0].instance as Mesh).material as MeshStandardMaterial).color;

describe('HoopBoard', () => {
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

  it('keeps the same ring objects when they are poured onto another rod', async () => {
    const before: Rods = [[0, 1, 1], [1], []];
    const ids = idsFor(before);
    const r = await renderBoard({ rods: before, ids });
    const [, top1, top2] = rings(r);

    await r.update(board({ rods: [[0], [1, 1, 1], []], ids: [[0], [3, 2, 1], []] }));
    expect(rings(r)).toEqual(expect.arrayContaining([top1, top2]));
    await r.advanceFrames(200, 0.016);
    expect(top1.position.x).toBe(top2.position.x);
    expect(top1.position.x).toBe(rodGroups(r)[1].instance.position.x);
  });

  it('lifts the whole matching run of the selected rod', async () => {
    const r = await renderBoard({ rods: [[0, 1, 1], []], selected: 0 });
    const [bottom, mid, top] = rings(r).map((o) => o.position.y);
    expect(mid).toBeGreaterThan(bottom + 1);
    expect(top).toBeGreaterThan(mid);
  });

  it('colors complete rods and hinted rods', async () => {
    const r = await renderBoard({ rods: [[2, 2, 2, 2], [0, 1], [1]], hint: [1, 2] });
    expect(poleColor(r, 0).equals(new Color(theme.done))).toBe(true);
    expect(poleColor(r, 1).equals(new Color(theme.hintFrom))).toBe(true);
    expect(poleColor(r, 2).equals(new Color(theme.hintTo))).toBe(true);
  });

  it('nudges the run the hint says to move', async () => {
    const plain = await renderBoard({ rods: [[0, 1], []] });
    const hinted = await renderBoard({ rods: [[0, 1], []], hint: [0, 1] });
    const ys = (r: Renderer) => rings(r).map((o) => o.position.y);
    expect(ys(hinted)[0]).toBe(ys(plain)[0]);
    expect(ys(hinted)[1]).toBeGreaterThan(ys(plain)[1]);
  });

  it('grows the poles and marks completion for taller rods', async () => {
    const short = await renderBoard({ rods: [[1, 1, 1, 1], []] });
    const tall = await renderBoard({ rods: [[1, 1, 1, 1], []], capacity: 6 });
    const poleHeight = (r: Renderer) => rodGroups(r)[0].children[0].instance.scale.y;
    expect(poleHeight(tall)).toBeGreaterThan(poleHeight(short));
    expect(poleColor(short, 0).equals(new Color(theme.done))).toBe(true);
    expect(poleColor(tall, 0).equals(new Color(theme.pole))).toBe(true);
  });

  it('paints rings with the ring palette', async () => {
    const r = await renderBoard({ rods: [[4]] });
    const mat = (rings(r)[0].children[0] as Mesh).material as MeshStandardMaterial;
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
    await r.fireEvent(rodGroups(r)[2].children[3], 'click');
    expect(onPress).toHaveBeenCalledWith(2);
  });
});
