import { useMemo } from 'react';
import * as THREE from 'three';

interface OrbitRingProps {
  radius: number;
  segments?: number;
}

export default function OrbitRing({ radius, segments = 128 }: OrbitRingProps) {
  const geometry = useMemo(() => {
    const points: THREE.Vector3[] = [];
    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      points.push(
        new THREE.Vector3(
          Math.cos(angle) * radius,
          0,
          Math.sin(angle) * radius
        )
      );
    }
    const geo = new THREE.BufferGeometry().setFromPoints(points);
    return geo;
  }, [radius, segments]);

  return (
    <lineLoop geometry={geometry}>
      <lineBasicMaterial color="rgba(96,165,250,0.25)" transparent />
    </lineLoop>
  );
}
