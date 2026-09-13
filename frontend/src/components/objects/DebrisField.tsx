/**
 * ORBITGUARD – DebrisField
 * ~2,200 debris objects around Earth in a single InstancedMesh (one draw
 * call). Per-instance color encodes risk; scale encodes the zoom-based
 * reveal: as the camera closes on Earth, tiers fade in one by one.
 * The legend (riskMask) can hide tiers entirely.
 */
import { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { DEBRIS_FIELD, generateDebrisInstances } from '../../data/satellites';
import { getObjectPosition } from '../../data/registry';
import { useOrbitGuard } from '../../store/orbitGuard';

const RISK_BASE_COLORS = [
  new THREE.Color('#22c55e'),
  new THREE.Color('#eab308'),
  new THREE.Color('#f97316'),
  new THREE.Color('#ef4444'),
];

/** camera-to-Earth distance at which each risk tier becomes visible.
 *  Earth radius is 1 visual unit; the 'Close' view sits ~4.2 units out. */
const TIER_REVEAL_DISTANCE = [40, 18, 8, 5];

export default function DebrisField({ earthGroup }: { earthGroup: React.RefObject<THREE.Group> }) {
  const instances = useMemo(() => generateDebrisInstances(DEBRIS_FIELD), []);
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const timeRef = useRef(0);
  /** smoothed visibility factor per risk tier, 0..1 */
  const tierFactor = useRef([0, 0, 0, 0]);

  const dummy = useMemo(() => new THREE.Object3D(), []);
  const tmpColor = useMemo(() => new THREE.Color(), []);

  const geometry = useMemo(() => new THREE.IcosahedronGeometry(1, 0), []);
  const baseColors = useMemo(
    () => instances.map((d) => RISK_BASE_COLORS[d.risk]),
    [instances]
  );

  // allocate the instanceColor buffer before first frame so the material
  // compiles with USE_INSTANCING_COLOR from the start
  useLayoutEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const black = new THREE.Color(0, 0, 0);
    for (let i = 0; i < instances.length; i++) mesh.setColorAt(i, black);
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [instances]);

  useFrame(({ camera }, delta) => {
    const mesh = meshRef.current;
    const host = earthGroup.current;
    if (!mesh || !host) return;

    const showDebris = useOrbitGuard.getState().showDebris;
    const riskMask = useOrbitGuard.getState().riskMask;
    const dt = Math.min(delta, 0.1);

    const speed = useOrbitGuard.getState().simPaused ? 0 : useOrbitGuard.getState().simSpeed;
    timeRef.current += dt * 0.35 * speed;
    const t = timeRef.current;

    const earthPos = getObjectPosition('planet:earth');
    const dist = earthPos ? camera.position.distanceTo(earthPos) : Infinity;

    for (let tier = 0; tier < 4; tier++) {
      const revealed = dist <= TIER_REVEAL_DISTANCE[tier] && riskMask[tier] && showDebris;
      const target = revealed ? 1 : 0;
      const cur = tierFactor.current[tier];
      tierFactor.current[tier] = cur + (target - cur) * Math.min(1, dt * 2.5);
    }

    instances.forEach((d, i) => {
      const angle = d.phase + t * d.angularSpeed;
      const x0 = Math.cos(angle) * d.a;
      const z0 = Math.sin(angle) * d.a;
      const sinX = Math.sin(d.tiltX);
      const cosX = Math.cos(d.tiltX);
      const sinY = Math.sin(d.tiltY);
      const cosY = Math.cos(d.tiltY);
      const y1 = -z0 * sinX + d.wobble;
      const z1 = z0 * cosX;
      dummy.position.set(x0 * cosY + z1 * sinY, y1, -x0 * sinY + z1 * cosY);

      const f = tierFactor.current[d.risk];

      dummy.scale.setScalar(f < 0.02 ? 0 : d.size);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
      mesh.setColorAt(i, tmpColor.copy(baseColors[i]).multiplyScalar(0.35 + 0.65 * f));
    });

    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  });

  return (
    <instancedMesh
      ref={meshRef}
      args={[geometry, undefined, instances.length]}
      frustumCulled={false}
    >
      <meshBasicMaterial toneMapped={false} transparent opacity={0.95} depthWrite={false} />
    </instancedMesh>
  );
}
