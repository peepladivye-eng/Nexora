/**
 * ORBITGUARD – search actions
 * Bridges TopNav search hits to the store's focus actions, mapping
 * scenario satellite ids to the 3D objects that exist in the scene.
 */
import { MAJOR_SATELLITES } from '../../data/satellites';
import { useOrbitGuard, SelectedSatInfo, RiskLevel } from '../../store/orbitGuard';

const BY_ID = new Map(MAJOR_SATELLITES.map((s) => [s.id, s]));

export function focusSatelliteFromUI(id: string): void {
  const s = BY_ID.get(id);
  if (!s) return;
  const info: SelectedSatInfo = {
    id: s.id,
    name: s.name,
    noradId: s.noradId,
    operator: s.operator,
    risk: s.risk as RiskLevel,
    isDebris: s.isDebris,
    altitudeKm: s.altitudeKm,
    velocityKmS: s.velocityKmS,
    inclinationDeg: s.inclinationDeg,
    orbitalPeriodMin: s.orbitalPeriodMin,
  };
  useOrbitGuard.getState().focusSatellite(s.id, info);
}

export function focusPlanetFromUI(id: string): void {
  useOrbitGuard.getState().focusPlanet(id);
}
