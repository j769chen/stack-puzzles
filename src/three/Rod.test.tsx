import { create } from '@react-three/test-renderer';
import { Color, type Mesh, type MeshStandardMaterial } from 'three';
import { theme } from '../theme';
import { Plank, Rod } from './Rod';

const props = { x: 1, z: 2, height: 3, padRadius: 0.8, hitRadius: 1, hitHeight: 4 };
const colorOf = (mesh: Mesh) => (mesh.material as MeshStandardMaterial).color;

describe('Rod', () => {
  it('stands at its position with default colors', async () => {
    const renderer = await create(<Rod {...props} onPress={jest.fn()} />);
    const group = renderer.scene.children[0];
    expect(group.instance.position.toArray()).toEqual([1, 0, 2]);
    const [pole, , pad] = group.children.map((c) => c.instance as Mesh);
    expect(colorOf(pole).equals(new Color(theme.pole))).toBe(true);
    expect(colorOf(pad).equals(new Color(theme.pad))).toBe(true);
  });

  it('uses the given highlight colors', async () => {
    const renderer = await create(
      <Rod {...props} poleColor={theme.done} padColor={theme.hintTo} onPress={jest.fn()} />,
    );
    const [pole, , pad] = renderer.scene.children[0].children.map((c) => c.instance as Mesh);
    expect(colorOf(pole).equals(new Color(theme.done))).toBe(true);
    expect(colorOf(pad).equals(new Color(theme.hintTo))).toBe(true);
  });

  it('presses through its invisible hit area without bubbling', async () => {
    const onPress = jest.fn();
    const stopPropagation = jest.fn();
    const renderer = await create(<Rod {...props} onPress={onPress} />);
    const hit = renderer.scene.children[0].children[3];
    await renderer.fireEvent(hit, 'click', { stopPropagation });
    expect(onPress).toHaveBeenCalledTimes(1);
    expect(stopPropagation).toHaveBeenCalledTimes(1);
  });
});

describe('Plank', () => {
  it('sits just below the floor line', async () => {
    const renderer = await create(<Plank width={4} depth={2} z={1} />);
    expect(renderer.scene.children[0].instance.position.toArray()).toEqual([0, -0.15, 1]);
  });
});
