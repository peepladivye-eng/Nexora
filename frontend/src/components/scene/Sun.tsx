import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Billboard } from '@react-three/drei';
import * as THREE from 'three';

interface SunProps {
  billboard?: boolean;
  position?: [number, number, number];
}

interface CoronaConfig {
  radius: number;
  baseOpacity: number;
  pulseSpeed: number;
  pulsePhase: number;
  pulseAmplitude: number;
  color: string;
}

const CORONAS: CoronaConfig[] = [
  {
    radius: 4.2,
    baseOpacity: 0.35,
    pulseSpeed: 0.6,
    pulsePhase: 0,
    pulseAmplitude: 0.15,
    color: '#fff3b0',
  },
  {
    radius: 5.8,
    baseOpacity: 0.22,
    pulseSpeed: 0.45,
    pulsePhase: 1.2,
    pulseAmplitude: 0.2,
    color: '#ffb347',
  },
  {
    radius: 8.0,
    baseOpacity: 0.12,
    pulseSpeed: 0.3,
    pulsePhase: 2.5,
    pulseAmplitude: 0.3,
    color: '#ff6b35',
  },
];

export default function Sun({ billboard = false, position = [0, 0, 0] }: SunProps) {
  const coreRef = useRef<THREE.Mesh>(null);
  const coronaRefs = useRef<(THREE.Mesh | null)[]>([]);

  useFrame((state) => {
    const time = state.clock.elapsedTime;

    CORONAS.forEach((cfg, i) => {
      const mesh = coronaRefs.current[i];
      if (!mesh) return;

      const pulse = 1 + Math.sin(time * cfg.pulseSpeed + cfg.pulsePhase) * cfg.pulseAmplitude;
      mesh.scale.setScalar(pulse);

      const material = mesh.material as THREE.ShaderMaterial;
      const pulseOpacity = cfg.baseOpacity * (0.75 + 0.25 * Math.sin(time * cfg.pulseSpeed * 1.3 + cfg.pulsePhase));
      material.uniforms.uOpacity.value = pulseOpacity;
    });

    if (coreRef.current) {
      const coreMat = coreRef.current.material as THREE.MeshStandardMaterial;
      const emissivePulse = 1 + Math.sin(time * 0.8) * 0.08;
      coreMat.emissiveIntensity = 2.0 * emissivePulse;
    }
  });

  const coronaUniformsFactory = (cfg: CoronaConfig) => ({
    uColor: { value: new THREE.Color(cfg.color) },
    uOpacity: { value: cfg.baseOpacity },
  });

  const coronaVertexShader = /* glsl */ `
    varying vec3 vNormal;
    varying vec3 vPosition;

    void main() {
      vNormal = normalize(normalMatrix * normal);
      vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
      vPosition = mvPos.xyz;
      gl_Position = projectionMatrix * mvPos;
    }
  `;

  const coronaFragmentShader = /* glsl */ `
    uniform vec3 uColor;
    uniform float uOpacity;

    varying vec3 vNormal;
    varying vec3 vPosition;

    void main() {
      vec3 viewDir = normalize(-vPosition);
      float rim = 1.0 - max(0.0, dot(viewDir, vNormal));
      float glow = pow(rim, 2.5);
      gl_FragColor = vec4(uColor, glow * uOpacity);
    }
  `;

  const sunContent = (
    <group position={position}>
      <mesh ref={coreRef}>
        <sphereGeometry args={[3, 64, 64]} />
        <meshStandardMaterial
          color="#fff7cc"
          emissive="#ffb347"
          emissiveIntensity={2.0}
          roughness={0.3}
          metalness={0.1}
        />
      </mesh>

      {CORONAS.map((cfg, i) => (
        <mesh
          key={i}
          ref={(el) => {
            coronaRefs.current[i] = el;
          }}
        >
          <sphereGeometry args={[cfg.radius, 48, 48]} />
          <shaderMaterial
            uniforms={coronaUniformsFactory(cfg)}
            vertexShader={coronaVertexShader}
            fragmentShader={coronaFragmentShader}
            transparent
            depthWrite={false}
            side={THREE.BackSide}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      ))}

      <pointLight
        color="#fff4d6"
        intensity={2.1}
        distance={0}
        decay={0}
        castShadow={false}
      />
    </group>
  );

  if (billboard) {
    return <Billboard>{sunContent}</Billboard>;
  }

  return sunContent;
}
