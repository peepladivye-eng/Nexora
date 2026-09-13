import { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { EARTH_POSITION } from '../data/planets';
import { useOrbitGuard, ZoomLevel } from '../store/orbitGuard';

function getLevelForDistance(distance: number): ZoomLevel {
  if (distance > 40) return 'system';
  if (distance >= 30) return 'planetary';
  if (distance >= 10) return 'regional';
  return 'close';
}

export function useCameraDistance(): { distanceToEarth: number; zoomLevel: ZoomLevel } {
  const { camera } = useThree();
  const zoomLevel = useOrbitGuard((s) => s.zoomLevel);
  const setZoomLevel = useOrbitGuard((s) => s.setZoomLevel);

  const earthPosRef = useRef(new THREE.Vector3(EARTH_POSITION[0], EARTH_POSITION[1], EARTH_POSITION[2]));
  const lastLevelRef = useRef<ZoomLevel | null>(null);
  const distanceRef = useRef<number>(0);

  useFrame(() => {
    const distance = camera.position.distanceTo(earthPosRef.current);
    distanceRef.current = distance;

    const newLevel = getLevelForDistance(distance);

    if (lastLevelRef.current !== newLevel) {
      lastLevelRef.current = newLevel;
      setZoomLevel(newLevel, distance);
    }
  });

  return {
    distanceToEarth: distanceRef.current,
    zoomLevel,
  };
}
