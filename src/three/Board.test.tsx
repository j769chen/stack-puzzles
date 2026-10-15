import { useThree } from '@react-three/fiber/native';
import { create } from '@react-three/test-renderer';
import { useEffect } from 'react';
import { Color, type DirectionalLight, type Mesh, type PerspectiveCamera, type Scene as ThreeScene, Vector3 } from 'three';
import { theme } from '../theme';
import { Scene } from './Board';

type Size = { width: number; height: number; depth: number };

let camera: PerspectiveCamera;
const captureCamera = (found: PerspectiveCamera) => {
  camera = found;
};

function CameraProbe() {
  const found = useThree((state) => state.camera) as PerspectiveCamera;
  useEffect(() => {
    captureCamera(found);
  }, [found]);
  return null;
}

const scene = (size: Size, tilt = 0.55) => (
  <Scene {...size} tilt={tilt}>
    <mesh name="piece" />
    <CameraProbe />
  </Scene>
);

function cornersInView({ width, height, depth }: Size) {
  const extents: number[] = [];
  for (const x of [-width / 2, width / 2])
    for (const y of [0, height])
      for (const z of [-depth / 2, depth / 2]) {
        const p = new Vector3(x, y, z).project(camera);
        extents.push(Math.max(Math.abs(p.x), Math.abs(p.y)));
      }
  return Math.max(...extents);
}

describe('Scene', () => {
  it.each([
    [{ width: 10.3, height: 5.2, depth: 3.5 }, 0.55],
    [{ width: 8.7, height: 4.6, depth: 8.6 }, 0.85],
    [{ width: 2, height: 9, depth: 2 }, 0.55],
  ])('frames the whole board %j at tilt %p', async (size, tilt) => {
    await create(scene(size, tilt));
    expect(cornersInView(size)).toBeLessThanOrEqual(0.94);
    expect(cornersInView(size)).toBeGreaterThan(0.9);
  });

  it('pulls the camera back when the board grows', async () => {
    const small = { width: 6, height: 3, depth: 2 };
    const large = { width: 12, height: 3, depth: 2 };
    const renderer = await create(scene(small));
    const before = camera.position.length();
    await renderer.update(scene(large));
    expect(camera.position.length()).toBeGreaterThan(before * 1.2);
    expect(cornersInView(large)).toBeLessThanOrEqual(0.94);
  });

  it('lights the board with a shadow-casting sun over a shadow-catching floor', async () => {
    const renderer = await create(scene({ width: 6, height: 3, depth: 2 }));
    const root = renderer.scene.instance as ThreeScene;
    expect((root.background as Color).equals(new Color(theme.bg))).toBe(true);

    const sun = renderer.scene.findByType('DirectionalLight').instance as DirectionalLight;
    expect(sun.castShadow).toBe(true);
    expect(sun.shadow.mapSize.toArray()).toEqual([1024, 1024]);

    const floor = renderer.scene.children.find((c) => (c.instance as Mesh).geometry?.type === 'PlaneGeometry')!;
    expect((floor.instance as Mesh).receiveShadow).toBe(true);
    expect(floor.instance.position.y).toBeLessThan(0);
  });

  it('renders the pieces it is given', async () => {
    const renderer = await create(scene({ width: 6, height: 3, depth: 2 }));
    expect(renderer.scene.children.some((c) => c.instance.name === 'piece')).toBe(true);
  });
});
