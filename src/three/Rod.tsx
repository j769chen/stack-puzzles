import { theme } from '../theme';
import { geometries, standardMaterial } from './shared';

type Props = {
  x: number;
  z: number;
  height: number;
  padRadius: number;
  poleColor?: string;
};

export function Rod({ x, z, height, padRadius, poleColor = theme.pole }: Props) {
  return (
    <group position={[x, 0, z]}>
      <mesh geometry={geometries.pole} material={standardMaterial(poleColor, 0.6)} scale-y={height} castShadow />
      <mesh geometry={geometries.poleCap} material={standardMaterial(poleColor, 0.6)} position-y={height} castShadow />
      <mesh
        geometry={geometries.pad}
        material={standardMaterial(theme.pad, 0.8)}
        rotation-x={-Math.PI / 2}
        position-y={0.005}
        scale={[padRadius, padRadius, 1]}
        receiveShadow
      />
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
