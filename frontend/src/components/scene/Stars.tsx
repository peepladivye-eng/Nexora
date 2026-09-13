import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const STAR_COUNT = 15000;

const STAR_PALETTE = [
  new THREE.Color('#ffffff'),
  new THREE.Color('#bfdbfe'),
  new THREE.Color('#fed7aa'),
  new THREE.Color('#fecaca'),
  new THREE.Color('#ddd6fe'),
];

export default function Stars() {
  const pointsRef = useRef<THREE.Points>(null);

  const { geometry, uniforms } = useMemo(() => {
    const positions = new Float32Array(STAR_COUNT * 3);
    const baseColors = new Float32Array(STAR_COUNT * 3);
    const baseSizes = new Float32Array(STAR_COUNT);
    const baseOpacities = new Float32Array(STAR_COUNT);
    const twinkleSpeeds = new Float32Array(STAR_COUNT);
    const twinklePhases = new Float32Array(STAR_COUNT);

    for (let i = 0; i < STAR_COUNT; i++) {
      const i3 = i * 3;

      const radius = 380 + Math.random() * 220;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      positions[i3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i3 + 2] = radius * Math.cos(phi);

      const color = STAR_PALETTE[Math.floor(Math.random() * STAR_PALETTE.length)];
      const variance = 0.8 + Math.random() * 0.4;
      baseColors[i3] = color.r * variance;
      baseColors[i3 + 1] = color.g * variance;
      baseColors[i3 + 2] = color.b * variance;

      baseSizes[i] = 0.4 + Math.random() * 1.6;
      baseOpacities[i] = 0.2 + Math.random() * 0.8;
      twinkleSpeeds[i] = 0.4 + Math.random() * 1.1;
      twinklePhases[i] = Math.random() * Math.PI * 2;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('aBaseColor', new THREE.BufferAttribute(baseColors, 3));
    geo.setAttribute('aBaseSize', new THREE.BufferAttribute(baseSizes, 1));
    geo.setAttribute('aBaseOpacity', new THREE.BufferAttribute(baseOpacities, 1));
    geo.setAttribute('aTwinkleSpeed', new THREE.BufferAttribute(twinkleSpeeds, 1));
    geo.setAttribute('aTwinklePhase', new THREE.BufferAttribute(twinklePhases, 1));

    const unis = {
      uTime: { value: 0 },
      uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
    };

    return { geometry: geo, uniforms: unis };
  }, []);

  useFrame((state) => {
    uniforms.uTime.value = state.clock.elapsedTime;
    if (pointsRef.current) {
      pointsRef.current.rotation.y += 0.00008;
    }
  });

  const vertexShader = /* glsl */ `
    attribute vec3 aBaseColor;
    attribute float aBaseSize;
    attribute float aBaseOpacity;
    attribute float aTwinkleSpeed;
    attribute float aTwinklePhase;

    uniform float uTime;
    uniform float uPixelRatio;

    varying vec3 vColor;
    varying float vOpacity;

    void main() {
      vColor = aBaseColor;

      float tw = 0.55 + 0.45 * sin(uTime * aTwinkleSpeed + aTwinklePhase);
      vOpacity = aBaseOpacity * tw;

      vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
      float size = aBaseSize * tw;
      gl_PointSize = size * uPixelRatio * (300.0 / -mvPosition.z);
      gl_Position = projectionMatrix * mvPosition;
    }
  `;

  const fragmentShader = /* glsl */ `
    varying vec3 vColor;
    varying float vOpacity;

    void main() {
      vec2 c = gl_PointCoord - 0.5;
      float d = length(c);
      if (d > 0.5) discard;

      float core = smoothstep(0.5, 0.0, d);
      float glow = smoothstep(0.5, 0.15, d) * 0.5;
      float alpha = (core + glow) * vOpacity;

      gl_FragColor = vec4(vColor, alpha);
    }
  `;

  return (
    <points ref={pointsRef} geometry={geometry} frustumCulled={false}>
      <shaderMaterial
        uniforms={uniforms}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}
