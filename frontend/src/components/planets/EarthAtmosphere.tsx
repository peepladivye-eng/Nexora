import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface EarthAtmosphereProps {
  planetRadius: number;
}

export default function EarthAtmosphere({ planetRadius }: EarthAtmosphereProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.MeshBasicMaterial>(null);

  useFrame(() => {
    if (materialRef.current) {
      materialRef.current.needsUpdate = true;
    }
  });

  return (
    <mesh ref={meshRef} scale={1.04}>
      <sphereGeometry args={[planetRadius, 64, 64]} />
      <meshBasicMaterial
        ref={materialRef}
        color="#60a5fa"
        transparent
        opacity={0.2}
        side={THREE.BackSide}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        onBeforeCompile={(shader) => {
          shader.vertexShader = shader.vertexShader
            .replace(
              '#include <common>',
              `#include <common>
               varying vec3 vNormalW;
               varying vec3 vPosW;`
            )
            .replace(
              '#include <worldpos_vertex>',
              `#include <worldpos_vertex>
               vNormalW = normalize(mat3(modelMatrix) * normal);
               vPosW = worldPosition.xyz;`
            );

          shader.fragmentShader = shader.fragmentShader
            .replace(
              '#include <common>',
              `#include <common>
               varying vec3 vNormalW;
               varying vec3 vPosW;
               uniform float uFresnelPower;
               uniform float uFresnelIntensity;`
            )
            .replace(
              'vec4 diffuseColor = vec4( diffuse, opacity );',
              `vec3 viewDirW = normalize(cameraPosition - vPosW);
               float fresnel = 1.0 - max(dot(viewDirW, normalize(vNormalW)), 0.0);
               fresnel = pow(fresnel, 2.5) * 1.4 + 0.08;
               vec4 diffuseColor = vec4( diffuse, opacity * fresnel );`
            );

          shader.uniforms.uFresnelPower = { value: 2.5 };
          shader.uniforms.uFresnelIntensity = { value: 1.4 };
        }}
      />
    </mesh>
  );
}
