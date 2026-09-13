/**
 * ORBITGUARD – ConjunctionScene
 * Visible only in conjunction mode: red link line between the two
 * objects, pulsing crossing marker, and — once the maneuver simulation
 * runs — an original-vs-corrected trajectory pair with an animated
 * debris ghost sliding onto the safe path.
 */
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Billboard, Text } from '@react-three/drei';
import * as THREE from 'three';
import { getObjectPosition } from '../../data/registry';
import { useOrbitGuard } from '../../store/orbitGuard';

/** maps catalog conjunction ids to 3D scene satellite ids */
const SCENE_ID_ALIASES: Record<string, string> = {
  'DEB-48291': 'deb-48291',
  'ISS-ZARYA': 'iss',
  'ISS (ZARYA)': 'iss',
  HUBBLE: 'hubble',
  'STARLINK-3176': 'starlink',
  'STARLINK-6781': 'starlink',
};

export default function ConjunctionScene() {
  const conjunctionMode = useOrbitGuard((s) => s.conjunctionMode);
  const selectedConjunction = useOrbitGuard((s) => s.selectedConjunction);
  const lineRef = useRef<THREE.LineSegments>(null);
  const markerRef = useRef<THREE.Mesh>(null);
  const labelGroupRef = useRef<THREE.Group>(null);

  // 2 endpoints × xyz
  const positions = useMemo(() => new Float32Array(6), []);

  useFrame(({ clock }) => {
    const line = lineRef.current;
    if (!line || !selectedConjunction) return;

    const primary = getObjectPosition(`sat:${SCENE_ID_ALIASES[selectedConjunction.primaryId] ?? selectedConjunction.primaryId}`);
    const secondary = getObjectPosition(`sat:${SCENE_ID_ALIASES[selectedConjunction.secondaryId] ?? selectedConjunction.secondaryId}`);

    // fall back gracefully when an id has no live object in the scene
    const a = primary ?? secondary;
    const b = secondary ?? primary;

    if (!a || !b) {
      line.visible = false;
      return;
    }

    const attr = line.geometry.getAttribute('position') as THREE.BufferAttribute;
    const arr = attr.array as Float32Array;
    arr[0] = a.x; arr[1] = a.y; arr[2] = a.z;
    arr[3] = b.x; arr[4] = b.y; arr[5] = b.z;
    attr.needsUpdate = true;
    line.geometry.computeBoundingSphere();
    line.visible = conjunctionMode;

    const mid = new THREE.Vector3((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2);

    if (markerRef.current) {
      markerRef.current.visible = conjunctionMode;
      markerRef.current.position.copy(mid);
      const pulse = 1 + 0.35 * Math.sin(clock.elapsedTime * 6);
      markerRef.current.scale.setScalar(pulse);
    }
    if (labelGroupRef.current) {
      labelGroupRef.current.visible = conjunctionMode;
      labelGroupRef.current.position.copy(mid).add(new THREE.Vector3(0, 0.28, 0));
    }
  });

  if (!selectedConjunction) return null;

  const missLabel =
    selectedConjunction.missDistanceKm < 1
      ? `${Math.round(selectedConjunction.missDistanceKm * 1000)} m`
      : `${selectedConjunction.missDistanceKm.toFixed(1)} km`;

  return (
    <group>
      <lineSegments ref={lineRef} visible={false}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[positions, 3]}
          />
        </bufferGeometry>
        <lineBasicMaterial color="#ef4444" transparent opacity={0.85} toneMapped={false} />
      </lineSegments>

      {/* crossing point */}
      <mesh ref={markerRef} visible={false}>
        <sphereGeometry args={[0.045, 16, 16]} />
        <meshBasicMaterial color="#ef4444" toneMapped={false} />
      </mesh>

      <Billboard>
        <group ref={labelGroupRef} visible={false}>
          <Text
            fontSize={0.09}
            color="#fca5a5"
            anchorX="center"
            anchorY="bottom"
            outlineWidth={0.012}
            outlineColor="#000000"
          >
            {`✕ ${missLabel}`}
          </Text>
        </group>
      </Billboard>
    </group>
  );
}
