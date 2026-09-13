import { useMemo } from 'react';
import * as THREE from 'three';

interface SaturnRingProps {
  planetRadius: number;
  tilt?: number;
}

export default function SaturnRing({ planetRadius, tilt = 0.47 }: SaturnRingProps) {
  const innerRadius = planetRadius * 1.4;
  const outerRadius = planetRadius * 2.2;

  const geometry = useMemo(() => {
    return new THREE.RingGeometry(innerRadius, outerRadius, 64);
  }, [innerRadius, outerRadius]);

  return (
    <mesh rotation={[Math.PI / 2 - tilt, 0, 0]} geometry={geometry}>
      <meshBasicMaterial
        color="#c9b896"
        side={THREE.DoubleSide}
        transparent
        opacity={0.55}
      />
    </mesh>
  );
}
