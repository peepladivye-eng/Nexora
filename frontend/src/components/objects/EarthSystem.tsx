/**
 * ORBITGUARD – EarthSystem
 * Planet already registers its live world position each frame; the
 * satellite host group mirrors that position so debris and satellites
 * travel with Earth around the Sun.
 */
import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { PLANET_BY_ID } from '../../data/planets';
import { getObjectPosition } from '../../data/registry';
import Planet from '../planets/Planet';
import EarthAtmosphere from '../planets/EarthAtmosphere';
import MajorSatellites from './MajorSatellites';
import DebrisField from './DebrisField';

export default function EarthSystem() {
  const earth = PLANET_BY_ID['earth'];
  const hostRef = useRef<THREE.Group>(null);

  useFrame(() => {
    const p = getObjectPosition('planet:earth');
    if (p && hostRef.current) hostRef.current.position.copy(p);
  });

  return (
    <group>
      <Planet config={earth}>
        <EarthAtmosphere planetRadius={earth.radius} />
      </Planet>

      <group ref={hostRef}>
        <MajorSatellites earthGroup={hostRef} />
        <DebrisField earthGroup={hostRef} />
      </group>
    </group>
  );
}
