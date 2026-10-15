import { Canvas, useThree } from '@react-three/fiber/native';
import { type ReactNode, useLayoutEffect } from 'react';
import { StyleSheet } from 'react-native';
import type { PerspectiveCamera } from 'three';
import { theme } from '../theme';
import { type BoardSize, fitCamera } from './fit';

type Props = BoardSize & { tilt?: number; children: ReactNode };

export function Board({ tilt = 0.55, ...props }: Props) {
  return (
    <Canvas style={styles.canvas} frameloop="demand" gl={{ antialias: false }} shadows="percentage" camera={{ fov: 32 }}>
      <Scene tilt={tilt} {...props} />
    </Canvas>
  );
}

export function Scene({ children, tilt, ...size }: BoardSize & { tilt: number; children: ReactNode }) {
  return (
    <>
      <color attach="background" args={[theme.bg]} />
      <CameraRig {...size} tilt={tilt} />
      <hemisphereLight args={['#FFF8EE', '#B9A58C', 1.6]} />
      <directionalLight
        position={[5, 12, 8]}
        intensity={2.4}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-12}
        shadow-camera-right={12}
        shadow-camera-top={12}
        shadow-camera-bottom={-12}
        shadow-bias={-0.0005}
      />
      <mesh rotation-x={-Math.PI / 2} position-y={-0.3} receiveShadow>
        <planeGeometry args={[80, 80]} />
        <shadowMaterial opacity={0.16} />
      </mesh>
      {children}
    </>
  );
}

function CameraRig({ width, height, depth, tilt }: BoardSize & { tilt: number }) {
  const camera = useThree((s) => s.camera) as PerspectiveCamera;
  const aspect = useThree((s) => s.size.width / s.size.height);
  const invalidate = useThree((s) => s.invalidate);

  useLayoutEffect(() => {
    fitCamera(camera, { width, height, depth }, tilt, aspect);
    invalidate();
  }, [camera, aspect, width, height, depth, tilt, invalidate]);

  return null;
}

const styles = StyleSheet.create({
  canvas: { flex: 1, alignSelf: 'stretch' },
});
