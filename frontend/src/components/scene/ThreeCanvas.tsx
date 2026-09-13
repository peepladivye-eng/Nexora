import { useRef, useEffect, ReactNode } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import Stars from './Stars';
import Nebula from './Nebula';
import Sun from './Sun';
import { useOrbitGuard } from '../../store/orbitGuard';

interface AllPlanetsProps {
  className?: string;
}

function AllPlanets(_props: AllPlanetsProps) {
  return (
    <group name="all-planets-placeholder">
    </group>
  );
}

interface ThreeCanvasProps {
  children?: ReactNode;
  earthSatellites?: ReactNode;
}

export default function ThreeCanvas({ children, earthSatellites }: ThreeCanvasProps) {
  const controlsInternalRef = useRef<OrbitControlsImpl>(null);
  const setControlsRef = useOrbitGuard((s) => s.setControlsRef);

  useEffect(() => {
    setControlsRef(controlsInternalRef);
    return () => {
      setControlsRef(null);
    };
  }, [setControlsRef]);

  return (
    <Canvas
      camera={{
        position: [45, 35, 70],
        fov: 55,
        near: 0.1,
        far: 2000,
      }}
      gl={{
        antialias: true,
        alpha: false,
        powerPreference: 'high-performance',
      }}
      dpr={[1, 2]}
      style={{ width: '100%', height: '100%', background: '#02030a' }}
    >
      <color attach="background" args={['#02030a']} />
      <fog attach="fog" args={['#02030a', 150, 600]} />

      <ambientLight intensity={0.06} />

      <Stars />
      <Nebula />
      <Sun position={[-30, 10, -50]} />
      <AllPlanets />

      {earthSatellites && (
        <group name="earth-satellites-slot">
          {earthSatellites}
        </group>
      )}

      {children}

      <OrbitControls
        ref={controlsInternalRef}
        makeDefault
        enableDamping
        dampingFactor={0.06}
        autoRotate
        autoRotateSpeed={0.35}
        minDistance={5}
        maxDistance={400}
        enablePan={true}
      />

      <EffectComposer multisampling={0} enableNormalPass={false}>
        <Bloom
          intensity={0.6}
          luminanceThreshold={0.2}
          luminanceSmoothing={0.9}
          mipmapBlur
          radius={0.5}
        />
      </EffectComposer>
    </Canvas>
  );
}
