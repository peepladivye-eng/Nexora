import { useRef, ReactNode } from 'react';
import { useFrame, ThreeEvent } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import * as THREE from 'three';
import { PlanetConfig } from '../../data/planets';
import { useOrbitGuard } from '../../store/orbitGuard';

interface PlanetProps {
  config: PlanetConfig;
  children?: ReactNode;
}

export default function Planet({ config, children }: PlanetProps) {
  const orbitGroupRef = useRef<THREE.Group>(null);
  const rotationGroupRef = useRef<THREE.Group>(null);
  const angleRef = useRef(Math.random() * Math.PI * 2);
  const meshRef = useRef<THREE.Mesh>(null);

  const showLabels = useOrbitGuard((s) => s.showLabels);
  const selectedPlanet = useOrbitGuard((s) => s.selectedPlanet);
  const setSelectedPlanet = useOrbitGuard((s) => s.setSelectedPlanet);

  const isSelected = selectedPlanet === config.id;

  useFrame((_, delta) => {
    angleRef.current += config.speed * delta * 0.15;
    const theta = angleRef.current;

    if (orbitGroupRef.current) {
      orbitGroupRef.current.position.x = Math.cos(theta) * config.distance;
      orbitGroupRef.current.position.z = Math.sin(theta) * config.distance;
    }

    if (rotationGroupRef.current) {
      rotationGroupRef.current.rotation.y += config.rotation;
    }
  });

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    setSelectedPlanet(config.id);
  };

  return (
    <group ref={orbitGroupRef}>
      <group ref={rotationGroupRef} rotation={[config.tilt, 0, 0]}>
        <mesh
          ref={meshRef}
          onClick={handleClick}
          onPointerOver={(e) => {
            e.stopPropagation();
            document.body.style.cursor = 'pointer';
          }}
          onPointerOut={() => {
            document.body.style.cursor = 'auto';
          }}
        >
          <sphereGeometry args={[config.radius, 64, 64]} />
          <meshStandardMaterial
            color={config.color}
            emissive={config.emissive ?? '#000000'}
            emissiveIntensity={config.emissiveIntensity ?? 0}
            roughness={config.roughness}
            metalness={config.metalness}
          />
        </mesh>
        {children}
      </group>

      {showLabels && (
        <Text
          position={[0, config.radius + 0.8, 0]}
          fontSize={0.5}
          color="#e2e8f0"
          anchorX="center"
          anchorY="bottom"
          outlineWidth={0.04}
          outlineColor="#000000"
        >
          {config.name}
        </Text>
      )}

      {isSelected && (
        <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
          <ringGeometry args={[config.radius * 1.15, config.radius * 1.25, 64]} />
          <meshBasicMaterial color="#60a5fa" transparent opacity={0.7} side={THREE.DoubleSide} />
        </mesh>
      )}
    </group>
  );
}
