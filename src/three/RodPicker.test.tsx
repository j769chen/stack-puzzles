import { act, create } from '@react-three/test-renderer';
import { type Object3D, PerspectiveCamera, Raycaster, Vector2, Vector3 } from 'three';
import { RodPicker } from './RodPicker';
import { TouchCancelled } from './touch';

const SIZE = 400;
const POINT = 2 / SIZE;

const camera = new PerspectiveCamera(32, 1);
camera.position.set(0, 6, 12);
camera.lookAt(0, 1, 0);
camera.updateMatrixWorld();

const at = (x: number, y: number) => {
  const p = new Vector3(x, y, 0).project(camera);
  return new Vector2(p.x, p.y);
};

const settle = () => act(() => new Promise((resolve) => setTimeout(resolve, 0)));

async function renderPicker(selected: number | null = null, touchCancelled = { current: false }) {
  const onPick = jest.fn();
  const onDrop = jest.fn();
  const onHover = jest.fn();
  const picker = (current: number | null) => (
    <TouchCancelled value={touchCancelled}>
      <RodPicker
        rods={[-2, 0, 2].map((x) => ({ x, z: 0 }))}
        stacks={[2, 2, 2]}
        piece={{ radius: 0.6, height: 0.5 }}
        liftY={2.5}
        reach={1}
        selected={current}
        onPick={onPick}
        onDrop={onDrop}
        onHover={onHover}
      />
    </TouchCancelled>
  );
  const renderer = await create(picker(selected), { width: SIZE, height: SIZE });
  const mesh = () => renderer.scene.children[0]!;
  const stopPropagation = jest.fn();
  const fire = (event: string, pointer: Vector2, pointerId = 1) =>
    renderer.fireEvent(mesh(), event, { pointer, pointerId, camera, stopPropagation });
  const press = (pointer: Vector2, pointerId = 1) => fire('pointerDown', pointer, pointerId);
  const select = (rod: number | null) => renderer.update(picker(rod));
  return { picker: mesh(), press, fire, select, onPick, onDrop, onHover, stopPropagation };
}

describe('RodPicker', () => {
  it('is invisible', async () => {
    const { picker } = await renderPicker();
    expect(picker.instance.visible).toBe(false);
  });

  it('catches every ray, so touches reach it without any geometry to hit', async () => {
    const { picker } = await renderPicker();
    const raycaster = new Raycaster();
    raycaster.setFromCamera(at(6, 1), camera);
    expect(raycaster.intersectObject(picker.instance as Object3D)).toEqual([
      expect.objectContaining({ object: picker.instance }),
    ]);
  });

  it('picks the nearest rod as soon as the finger touches down', async () => {
    const { press, onPick, stopPropagation } = await renderPicker();
    await press(at(2, 1));
    expect(onPick).toHaveBeenCalledWith(2);
    expect(stopPropagation).toHaveBeenCalledTimes(1);
  });

  it('ignores touches away from every rod', async () => {
    const { press, onPick } = await renderPicker();
    await press(at(6, 1));
    expect(onPick).not.toHaveBeenCalled();
  });

  it('drags a picked-up piece across rods and drops it where the finger lifts', async () => {
    const { press, fire, select, onPick, onDrop, onHover } = await renderPicker();
    await press(at(-2, 1));
    expect(onPick).toHaveBeenCalledWith(0);
    await select(0);
    await fire('pointerMove', at(0, 1));
    await fire('pointerMove', at(0, 1.5));
    await fire('pointerMove', at(2, 1));
    expect(onHover.mock.calls).toEqual([[1], [2]]);
    await fire('pointerUp', at(2, 1));
    await settle();
    expect(onHover).toHaveBeenLastCalledWith(null);
    expect(onDrop).toHaveBeenCalledWith(2);
  });

  it('keeps the piece picked up when the finger lifts on the same rod or off every rod', async () => {
    const { press, fire, select, onDrop } = await renderPicker();
    await press(at(-2, 1));
    await select(0);
    await fire('pointerUp', at(-2, 1));
    await select(null);
    await press(at(-2, 1));
    await select(0);
    await fire('pointerUp', at(6, 1));
    await settle();
    expect(onDrop).not.toHaveBeenCalled();
  });

  it('treats a touch that slides under 10 points as a tap, even across to the next rod', async () => {
    const { press, fire, select, onPick, onDrop, onHover } = await renderPicker();
    const between = at(-1, 1);
    await press(new Vector2(between.x - 4 * POINT, between.y));
    expect(onPick).toHaveBeenCalledWith(0);
    await select(0);
    const over = new Vector2(between.x + 4 * POINT, between.y);
    await fire('pointerMove', over);
    await fire('pointerUp', over);
    await settle();
    expect(onHover).not.toHaveBeenCalled();
    expect(onDrop).not.toHaveBeenCalled();
  });

  it('drags once the finger has moved 10 points, even if it comes back', async () => {
    const { press, fire, select, onDrop, onHover } = await renderPicker();
    const between = at(-1, 1);
    await press(new Vector2(between.x - 4 * POINT, between.y));
    await select(0);
    await fire('pointerMove', new Vector2(between.x + 7 * POINT, between.y));
    expect(onHover).toHaveBeenLastCalledWith(1);
    await fire('pointerUp', new Vector2(between.x + 4 * POINT, between.y));
    await settle();
    expect(onDrop).toHaveBeenCalledWith(1);
  });

  it('ignores other fingers while one is dragging a piece', async () => {
    const { press, fire, select, onPick, onDrop, onHover } = await renderPicker();
    await press(at(-2, 1), 1);
    await select(0);
    await fire('pointerMove', at(2, 1), 1);
    await press(at(0, 1), 2);
    await fire('pointerMove', at(0, 1), 2);
    await fire('pointerUp', at(0, 1), 2);
    expect(onPick).toHaveBeenCalledTimes(1);
    expect(onHover.mock.calls).toEqual([[2]]);
    await fire('pointerUp', at(2, 1), 1);
    await settle();
    expect(onDrop).toHaveBeenCalledWith(2);
  });

  it('does not drag when the touch drops an already picked-up piece', async () => {
    const { press, fire, onPick, onDrop, onHover } = await renderPicker(1);
    await press(at(-2, 1));
    expect(onPick).toHaveBeenCalledWith(0);
    await fire('pointerMove', at(2, 1));
    await fire('pointerUp', at(2, 1));
    await settle();
    expect(onHover).not.toHaveBeenCalled();
    expect(onDrop).not.toHaveBeenCalled();
  });

  it('puts the piece back over its rod instead of dropping it when the touch is cancelled', async () => {
    const touchCancelled = { current: false };
    const { press, fire, select, onDrop, onHover } = await renderPicker(null, touchCancelled);
    await press(at(-2, 1));
    await select(0);
    await fire('pointerMove', at(2, 1));
    const lift = fire('pointerUp', at(2, 1));
    touchCancelled.current = true;
    await lift;
    await settle();
    expect(onHover).toHaveBeenLastCalledWith(null);
    expect(onDrop).not.toHaveBeenCalled();
  });

  it('forgets a drag that was cut off before the finger lifted', async () => {
    const { press, fire, select, onPick, onHover } = await renderPicker();
    await press(at(-2, 1));
    await select(0);
    await fire('pointerMove', at(2, 1));
    expect(onHover).toHaveBeenLastCalledWith(2);
    await select(null);
    await press(at(0, 1), 2);
    expect(onHover).toHaveBeenLastCalledWith(null);
    expect(onPick).toHaveBeenLastCalledWith(1);
  });
});
