import { useOrbitGuard } from '../../store/orbitGuard';
import { PLANETS } from '../../data/planets';
import OrbitRing from './OrbitRing';
import Planet from './Planet';
import SaturnRing from './SaturnRing';
import EarthAtmosphere from './EarthAtmosphere';

export default function AllPlanets() {
  const showOrbits = useOrbitGuard((s) => s.showOrbits);

  return (
    <>
      {PLANETS.filter((planet) => planet.id !== 'earth').map((planet) => (
        <group key={planet.id}>
          {showOrbits && <OrbitRing radius={planet.distance} />}
          <Planet config={planet}>
            {planet.id === 'earth' && (
              <EarthAtmosphere planetRadius={planet.radius} />
            )}
            {planet.id === 'saturn' && (
              <SaturnRing planetRadius={planet.radius} tilt={planet.tilt} />
            )}
          </Planet>
        </group>
      ))}
    </>
  );
}
