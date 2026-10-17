import { create } from '@react-three/test-renderer';
import { Color, type Mesh, type MeshStandardMaterial } from 'three';
import { theme } from '../theme';
import { Plank, Rod } from './Rod';

const props = { x: 1, z: 2, height: 3, padRadius: 0.8 };
const colorOf = (mesh: Mesh) => (mesh.material as MeshStandardMaterial).color;

describe('Rod', () => {
  it('stands at its position with default colors', async () => {
    const renderer = await create(<Rod {...props} />);
    const group = renderer.scene.children[0]!;
    expect(group.instance.position.toArray()).toEqual([1, 0, 2]);
    const [pole, , pad] = group.children.map((c) => c.instance as Mesh);
    expect(colorOf(pole!).equals(new Color(theme.pole))).toBe(true);
    expect(colorOf(pad!).equals(new Color(theme.pad))).toBe(true);
  });

  it('uses the given pole color', async () => {
    const renderer = await create(<Rod {...props} poleColor={theme.done} />);
    const [pole, , pad] = renderer.scene.children[0]!.children.map((c) => c.instance as Mesh);
    expect(colorOf(pole!).equals(new Color(theme.done))).toBe(true);
    expect(colorOf(pad!).equals(new Color(theme.pad))).toBe(true);
  });
});

describe('Plank', () => {
  it('sits just below the floor line', async () => {
    const renderer = await create(<Plank width={4} depth={2} z={1} />);
    expect(renderer.scene.children[0]!.instance.position.toArray()).toEqual([0, -0.15, 1]);
  });
});

describe('shared resources', () => {
  it('reuses geometry and materials across rods', async () => {
    const renderer = await create(
      <>
        <Rod {...props} />
        <Rod {...props} x={3} height={5} />
      </>,
    );
    const [a, b] = renderer.scene.children.map((g) => g.children.map((c) => c.instance as Mesh));
    a!.forEach((mesh, i) => {
      expect(mesh.geometry).toBe(b![i]!.geometry);
      expect(mesh.material).toBe(b![i]!.material);
    });
    expect(b![0]!.scale.y).toBe(5);
  });
});
