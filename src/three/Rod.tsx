import type { ThreeEvent } from '@react-three/fiber/native';
import { theme } from '../theme';
import { geometries, hitAreaMaterial, standardMaterial } from './shared';

type Props = {
  x: number;
  z: number;
  height: number;
  padRadius: number;
  hitRadius: number;
  hitHeight: number;
  poleColor?: string;
  padColor?: string;
  onPress: () => void;
};

export function Rod({ x, z, height, padRadius, hitRadius, hitHeight, poleColor = theme.pole, padColor = theme.pad, onPress }: Props) {
  const press = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    onPress();
  };

  return (
    <group position={[x, 0, z]}>
      <mesh geometry={geometries.pole} material={standardMaterial(poleColor, 0.6)} scale-y={height} castShadow />
      <mesh geometry={geometries.poleCap} material={standardMaterial(poleColor, 0.6)} position-y={height} castShadow />
      <mesh
        geometry={geometries.pad}
        material={standardMaterial(padColor, 0.8)}
        rotation-x={-Math.PI / 2}
        position-y={0.005}
        scale={[padRadius, padRadius, 1]}
        receiveShadow
      />
      <mesh geometry={geometries.hitArea} material={hitAreaMaterial} scale={[hitRadius, hitHeight, hitRadius]} onClick={press} />
    </group>
  );
}

export function Plank({ width, depth, z = 0 }: { width: number; depth: number; z?: number }) {
  return (
    <mesh
      geometry={geometries.plank}
      material={standardMaterial(theme.base, 0.75)}
      position={[0, -0.15, z]}
      scale={[width, 1, depth]}
      castShadow
      receiveShadow
    />
  );
}
