import type { ThreeEvent } from '@react-three/fiber/native';
import { theme } from '../theme';

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
      <mesh position-y={height / 2} castShadow>
        <cylinderGeometry args={[0.11, 0.13, height, 20]} />
        <meshStandardMaterial color={poleColor} roughness={0.6} />
      </mesh>
      <mesh position-y={height} castShadow>
        <sphereGeometry args={[0.11, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color={poleColor} roughness={0.6} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position-y={0.005} receiveShadow>
        <circleGeometry args={[padRadius, 40]} />
        <meshStandardMaterial color={padColor} roughness={0.8} />
      </mesh>
      <mesh position-y={hitHeight / 2} onClick={press}>
        <cylinderGeometry args={[hitRadius, hitRadius, hitHeight, 12]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
    </group>
  );
}

export function Plank({ width, depth, z = 0 }: { width: number; depth: number; z?: number }) {
  return (
    <mesh position={[0, -0.15, z]} castShadow receiveShadow>
      <boxGeometry args={[width, 0.3, depth]} />
      <meshStandardMaterial color={theme.base} roughness={0.75} />
    </mesh>
  );
}
