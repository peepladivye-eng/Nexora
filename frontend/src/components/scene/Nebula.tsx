import { useMemo } from 'react';
import * as THREE from 'three';

interface NebulaPlaneConfig {
  position: [number, number, number];
  rotation: [number, number, number];
  size: [number, number];
  colorA: string;
  colorB: string;
  colorC: string;
  center: [number, number];
  opacity: number;
  scaleA: number;
  scaleB: number;
}

const NEBULA_PLANES: NebulaPlaneConfig[] = [
  {
    position: [-120, 40, -200],
    rotation: [0.15, 0.4, -0.1],
    size: [320, 240],
    colorA: '#1e3a8a',
    colorB: '#7c3aed',
    colorC: '#0ea5e9',
    center: [0.3, 0.6],
    opacity: 0.18,
    scaleA: 2.2,
    scaleB: 3.5,
  },
  {
    position: [150, -60, -180],
    rotation: [-0.2, -0.3, 0.15],
    size: [380, 260],
    colorA: '#9f1239',
    colorB: '#ea580c',
    colorC: '#f59e0b',
    center: [0.7, 0.4],
    opacity: 0.14,
    scaleA: 2.8,
    scaleB: 2.1,
  },
  {
    position: [0, 100, -260],
    rotation: [0.08, 0.1, 0.05],
    size: [420, 300],
    colorA: '#312e81',
    colorB: '#0891b2',
    colorC: '#06b6d4',
    center: [0.5, 0.3],
    opacity: 0.12,
    scaleA: 1.8,
    scaleB: 4.0,
  },
  {
    position: [-80, -100, -220],
    rotation: [-0.12, 0.25, 0.08],
    size: [300, 280],
    colorA: '#581c87',
    colorB: '#be185d',
    colorC: '#ec4899',
    center: [0.4, 0.55],
    opacity: 0.15,
    scaleA: 3.2,
    scaleB: 2.6,
  },
];

interface NebulaPlaneProps {
  config: NebulaPlaneConfig;
}

function NebulaPlane({ config }: NebulaPlaneProps) {
  const uniforms = useMemo(() => {
    return {
      uColorA: { value: new THREE.Color(config.colorA) },
      uColorB: { value: new THREE.Color(config.colorB) },
      uColorC: { value: new THREE.Color(config.colorC) },
      uCenter: { value: new THREE.Vector2(config.center[0], config.center[1]) },
      uOpacity: { value: config.opacity },
      uScaleA: { value: config.scaleA },
      uScaleB: { value: config.scaleB },
    };
  }, [config]);

  const vertexShader = /* glsl */ `
    varying vec2 vUv;

    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `;

  const fragmentShader = /* glsl */ `
    uniform vec3 uColorA;
    uniform vec3 uColorB;
    uniform vec3 uColorC;
    uniform vec2 uCenter;
    uniform float uOpacity;
    uniform float uScaleA;
    uniform float uScaleB;

    varying vec2 vUv;

    void main() {
      vec2 d = vUv - uCenter;
      float distA = length(d * uScaleA);
      float distB = length(d * uScaleB);

      float grad1 = smoothstep(1.0, 0.0, distA);
      float grad2 = smoothstep(1.2, 0.0, distB);

      vec3 col = mix(uColorA, uColorB, grad1);
      col = mix(col, uColorC, grad2 * 0.6);

      float edge = smoothstep(0.0, 0.35, vUv.x) * smoothstep(1.0, 0.65, vUv.x)
                 * smoothstep(0.0, 0.35, vUv.y) * smoothstep(1.0, 0.65, vUv.y);

      float alpha = (grad1 * 0.7 + grad2 * 0.3) * uOpacity * edge;

      gl_FragColor = vec4(col, alpha);
    }
  `;

  return (
    <mesh position={config.position} rotation={config.rotation}>
      <planeGeometry args={[config.size[0], config.size[1]]} />
      <shaderMaterial
        uniforms={uniforms}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        transparent
        depthWrite={false}
        side={THREE.DoubleSide}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  );
}

export default function Nebula() {
  return (
    <group>
      {NEBULA_PLANES.map((cfg, i) => (
        <NebulaPlane key={i} config={cfg} />
      ))}
    </group>
  );
}
