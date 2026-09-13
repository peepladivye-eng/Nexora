/**
 * ORBITGUARD – MajorSatellites
 * Named objects (ISS, Hubble, Starlink, DEB-48291) orbiting Earth.
 * Each is a clickable group with a halo + billboard sprite, orbit line
 * trail, and zoom-based labels. Positions are written to the registry
 * every frame for the camera director and conjunction visuals.
 */
import { useMemo, useRef, useState } from 'react';
import { useFrame, useThree, ThreeEvent } from '@react-three/fiber';
import { Billboard, Text } from '@react-three/drei';
import * as THREE from 'three';
import { MAJOR_SATELLITES, satLocalPosition, SatConfig } from '../../data/satellites';
import { registerObject, setObjectPosition } from '../../data/registry';
import { useOrbitGuard } from '../../store/orbitGuard';

const SAT_COLORS: Record<string, string> = {
  LOW: '#22c55e',
  SAFE: '#22c55e',
  WATCH: '#eab308',
  MEDIUM: '#f97316',
  HIGH: '#ef4444',
  CRITICAL: '#ef4444',
};

function OrbitTrace({ cfg, color }: { cfg: SatConfig; color: string }) {
  const geometry = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= 128; i++) {
      const t = (i / 128) * Math.PI * 2;
      const tmp = new THREE.Vector3();
      // sample the orbit by temporarily overriding phase — cheap and exact
      const original = { ...cfg, phase: t };
      satLocalPosition(original, 0, tmp);
      pts.push(tmp.clone());
    }
    return new THREE.BufferGeometry().setFromPoints(pts);
  }, [cfg]);

  return (
    <lineLoop geometry={geometry}>
      <lineBasicMaterial color={color} transparent opacity={0.18} />
    </lineLoop>
  );
}

function SatMarker({
  cfg,
  earthGroup,
}: {
  cfg: SatConfig;
  earthGroup: React.RefObject<THREE.Group>;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const haloRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  const { camera } = useThree();

  const showLabels = useOrbitGuard((s) => s.showLabels);
  const selectedSatellite = useOrbitGuard((s) => s.selectedSatellite);
  const focusSatellite = useOrbitGuard((s) => s.focusSatellite);

  const regId = `sat:${cfg.id}`;
  const isSelected = selectedSatellite === cfg.id;
  const color = SAT_COLORS[cfg.risk] ?? '#94a3b8';
  const isCritical = cfg.risk === 'CRITICAL';

  const local = useMemo(() => new THREE.Vector3(), []);
  const world = useMemo(() => new THREE.Vector3(), []);

  useFrame(({ clock }, delta) => {
    const g = groupRef.current;
    const earth = earthGroup.current;
    if (!g || !earth) return;

    const t = clock.elapsedTime;
    satLocalPosition(cfg, t, local);
    g.position.copy(local);

    world.copy(local).applyMatrix4(earth.matrixWorld);
    setObjectPosition(regId, world);

    if (haloRef.current) {
      const m = haloRef.current.material as THREE.MeshBasicMaterial;
      const base = isSelected || hovered ? 0.85 : isCritical ? 0.5 : 0.3;
      m.opacity = base * (0.75 + 0.25 * Math.sin(t * (isCritical ? 5 : 2.2)));
      haloRef.current.scale.setScalar(
        (isSelected || hovered ? 2.2 : isCritical ? 1.9 : 1.4) * (1 + 0.06 * Math.sin(t * 3))
      );
    }

    void camera;
    void delta;
  });

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    focusSatellite(cfg.id, {
      id: cfg.id,
      name: cfg.name,
      noradId: cfg.noradId,
      operator: cfg.operator,
      risk: cfg.risk,
      isDebris: cfg.isDebris,
      altitudeKm: cfg.altitudeKm,
      velocityKmS: cfg.velocityKmS,
      inclinationDeg: cfg.inclinationDeg,
      orbitalPeriodMin: cfg.orbitalPeriodMin,
    });
  };

  const haloColor = isCritical ? '#ef4444' : color;

  return (
    <>
      <OrbitTrace cfg={cfg} color={color} />
      <group ref={groupRef}>
        <mesh
          onClick={handleClick}
          onPointerOver={(e) => {
            e.stopPropagation();
            setHovered(true);
            document.body.style.cursor = 'pointer';
          }}
          onPointerOut={() => {
            setHovered(false);
            document.body.style.cursor = 'auto';
          }}
        >
          <sphereGeometry args={[cfg.size, 12, 12]} />
          <meshBasicMaterial color={cfg.color} toneMapped={false} />
        </mesh>

        <Billboard>
          <mesh ref={haloRef}>
            <circleGeometry args={[cfg.size * 2.6, 24]} />
            <meshBasicMaterial
              color={haloColor}
              transparent
              opacity={0.3}
              depthWrite={false}
              blending={THREE.AdditiveBlending}
              toneMapped={false}
            />
          </mesh>
        </Billboard>

        {showLabels && (
          <Billboard position={[0, cfg.size + 0.09, 0]}>
            <Text
              fontSize={0.055}
              color={isCritical ? '#fca5a5' : '#cbd5e1'}
              anchorX="center"
              anchorY="bottom"
              outlineWidth={0.006}
              outlineColor="#000000"
            >
              {cfg.name}
            </Text>
          </Billboard>
        )}
      </group>
    </>
  );
}

export default function MajorSatellites({ earthGroup }: { earthGroup: React.RefObject<THREE.Group> }) {
  return (
    <group>
      {MAJOR_SATELLITES.map((cfg) => (
        <SatMarker key={cfg.id} cfg={cfg} earthGroup={earthGroup} />
      ))}
    </group>
  );
}
