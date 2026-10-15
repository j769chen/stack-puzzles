import { create } from '@react-three/test-renderer';
import { PerspectiveCamera, Vector2, Vector3 } from 'three';
import { RodPicker } from './RodPicker';

const camera = new PerspectiveCamera(32, 1);
camera.position.set(0, 6, 12);
camera.lookAt(0, 1, 0);
camera.updateMatrixWorld();

const at = (x: number, y: number) => {
  const p = new Vector3(x, y, 0).project(camera);
  return new Vector2(p.x, p.y);
};

async function renderPicker() {
  const onPick = jest.fn();
  const renderer = await create(
    <RodPicker rods={[-2, 0, 2].map((x) => ({ x, z: 0 }))} height={3} reach={1} onPick={onPick} />,
  );
  const picker = renderer.scene.children[0];
  const press = (pointer: Vector2, stopPropagation = jest.fn()) =>
    renderer.fireEvent(picker, 'pointerDown', { pointer, camera, stopPropagation });
  return { picker, press, onPick };
}

describe('RodPicker', () => {
  it('is invisible', async () => {
    const { picker } = await renderPicker();
    expect(picker.instance.visible).toBe(false);
  });

  it('picks the nearest rod as soon as the finger touches down', async () => {
    const { press, onPick } = await renderPicker();
    const stopPropagation = jest.fn();
    await press(at(2, 1), stopPropagation);
    expect(onPick).toHaveBeenCalledWith(2);
    expect(stopPropagation).toHaveBeenCalledTimes(1);
  });

  it('ignores touches away from every rod', async () => {
    const { press, onPick } = await renderPicker();
    await press(at(6, 1));
    expect(onPick).not.toHaveBeenCalled();
  });
});
