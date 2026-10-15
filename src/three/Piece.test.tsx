import { type RootState, useThree } from '@react-three/fiber/native';
import { create } from '@react-three/test-renderer';
import { useEffect } from 'react';
import type { Group } from 'three';
import { Piece } from './Piece';

const LIFT = 3;

let internal: RootState['internal'];
const captureInternal = (found: RootState['internal']) => {
  internal = found;
};

function FrameProbe() {
  const found = useThree((s) => s.internal);
  useEffect(() => {
    captureInternal(found);
  }, [found]);
  return null;
}

async function renderPiece(x: number, y: number) {
  const renderer = await create(
    <Piece x={x} y={y} z={0} liftY={LIFT}>
      <mesh />
    </Piece>,
  );
  const group = renderer.scene.children[0].instance as Group;
  const moveTo = (nx: number, ny: number) =>
    renderer.update(
      <Piece x={nx} y={ny} z={0} liftY={LIFT}>
        <mesh />
      </Piece>,
    );
  return { renderer, group, moveTo };
}

describe('Piece', () => {
  it('appears at its spot without animating', async () => {
    const { group } = await renderPiece(1, 2);
    expect(group.position.toArray()).toEqual([1, 2, 0]);
  });

  it('slides straight up or down on the same rod', async () => {
    const { renderer, group, moveTo } = await renderPiece(0, 0);
    await moveTo(0, 1);
    await renderer.advanceFrames(1, 0.016);
    expect(group.position.x).toBe(0);
    expect(group.position.y).toBeGreaterThan(0);
    expect(group.position.y).toBeLessThan(1);
    await renderer.advanceFrames(60, 0.016);
    expect(group.position.toArray()).toEqual([0, 1, 0]);
  });

  it('lifts clear of the rods before crossing to another rod', async () => {
    const { renderer, group, moveTo } = await renderPiece(0, 0);
    await moveTo(2, 0);
    const xs: number[] = [];
    const ys: number[] = [];
    for (let i = 0; i < 120; i++) {
      await renderer.advanceFrames(1, 0.016);
      xs.push(group.position.x);
      ys.push(group.position.y);
    }
    const crossing = xs.map((x, i) => (x > 0 && x < 2 ? ys[i] : null)).filter((y) => y !== null);
    expect(crossing.length).toBeGreaterThan(0);
    expect(crossing.every((y) => y === LIFT)).toBe(true);
    expect(Math.max(...ys)).toBe(LIFT);
    expect(group.position.toArray()).toEqual([2, 0, 0]);
  });

  it('moves a bounded distance on a long frame hitch instead of teleporting', async () => {
    const { renderer, group, moveTo } = await renderPiece(0, 0);
    await moveTo(0, 2);
    await renderer.advanceFrames(1, 1);
    expect(group.position.y).toBeGreaterThan(0);
    expect(group.position.y).toBeLessThanOrEqual(1);
  });

  it('crosses at its current height when already above the lift line', async () => {
    const { renderer, group, moveTo } = await renderPiece(0, LIFT + 1);
    await moveTo(2, 0);
    let highest = 0;
    for (let i = 0; i < 120; i++) {
      await renderer.advanceFrames(1, 0.016);
      highest = Math.max(highest, group.position.y);
    }
    expect(highest).toBe(LIFT + 1);
    expect(group.position.toArray()).toEqual([2, 0, 0]);
  });

  it('stays put when re-rendered at the same spot', async () => {
    const { renderer, group, moveTo } = await renderPiece(1, 1);
    await moveTo(1, 1);
    await renderer.advanceFrames(10, 0.016);
    expect(group.position.toArray()).toEqual([1, 1, 0]);
  });

  it('replans from wherever it is when the target changes mid-flight', async () => {
    const { renderer, group, moveTo } = await renderPiece(0, 0);
    await moveTo(2, 0);
    await renderer.advanceFrames(3, 0.016);
    await moveTo(-2, 1);
    await renderer.advanceFrames(200, 0.016);
    expect(group.position.toArray()).toEqual([-2, 1, 0]);
  });

  it.each([60, 10])('finishes a long move within the same time budget at %ifps', async (fps) => {
    const { renderer, group, moveTo } = await renderPiece(0, 0);
    await moveTo(6, 2);
    let seconds = 0;
    while (group.position.x !== 6 || group.position.y !== 2) {
      await renderer.advanceFrames(1, 1 / fps);
      seconds += 1 / fps;
    }
    expect(seconds).toBeLessThanOrEqual(0.5 + 2 / fps);
  });

  it('requests frames on demand only while it is moving', async () => {
    jest.useFakeTimers();
    const piece = (nx: number) => (
      <>
        <FrameProbe />
        <Piece x={nx} y={0} z={0} liftY={LIFT}>
          <mesh />
        </Piece>
      </>
    );
    const renderer = await create(piece(0), { frameloop: 'demand' });
    const group = renderer.scene.children[0].instance as Group;

    internal.frames = 0;
    await renderer.update(piece(2));
    expect(internal.frames).toBeGreaterThan(0);

    internal.frames = 0;
    await renderer.advanceFrames(1, 0.016);
    expect(internal.frames).toBeGreaterThan(0);

    await renderer.advanceFrames(200, 0.016);
    expect(group.position.toArray()).toEqual([2, 0, 0]);
    internal.frames = 0;
    await renderer.advanceFrames(1, 0.016);
    expect(internal.frames).toBe(0);
    jest.useRealTimers();
  });
});
