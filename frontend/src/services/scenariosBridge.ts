/**
 * ORBITGUARD – scenario bridge
 * Maps a scenario id to the stats + headline conjunction it produces,
 * using the existing deterministic data in services/scenarios.ts.
 */
import type { Conjunction } from '../store/orbitGuard';
import { MAIN_CONJUNCTION, UPCOMING_CONJUNCTIONS_FOR_DEB_48291 } from './scenarios';

export interface AppliedScenario {
  stats: { trackedObjects: number; activeAlerts: number; collisionRisks: number };
  headline: Conjunction | null;
  conjunctions: Conjunction[];
}

const BASE_CONJUNCTIONS = UPCOMING_CONJUNCTIONS_FOR_DEB_48291;

export const CONJUNCTIONS_BY_SCENARIO: Record<string, Conjunction[]> = {
  critical:    BASE_CONJUNCTIONS,
  high:        BASE_CONJUNCTIONS,
  typical:     BASE_CONJUNCTIONS.slice(0, 4),
  educational: BASE_CONJUNCTIONS.slice(0, 3),
  quiet:       BASE_CONJUNCTIONS.slice(4),
  live:        BASE_CONJUNCTIONS,
};

export function applyScenario(
  id: string,
  _library: Record<string, Conjunction[]>
): AppliedScenario {
  const conjunctions = CONJUNCTIONS_BY_SCENARIO[id] ?? BASE_CONJUNCTIONS;
  const headline = conjunctions[0] ?? null;

  const statsByScenario: Record<string, AppliedScenario['stats']> = {
    critical:    { trackedObjects: 34218, activeAlerts: 12, collisionRisks: 3 },
    high:        { trackedObjects: 34218, activeAlerts: 27, collisionRisks: 8 },
    typical:     { trackedObjects: 34218, activeAlerts: 9,  collisionRisks: 2 },
    educational: { trackedObjects: 34218, activeAlerts: 4,  collisionRisks: 1 },
    quiet:       { trackedObjects: 34218, activeAlerts: 1,  collisionRisks: 0 },
    live:        { trackedObjects: 34218, activeAlerts: 12, collisionRisks: 3 },
  };

  return { stats: statsByScenario[id] ?? statsByScenario.critical, headline, conjunctions };
}

export { MAIN_CONJUNCTION };

/**
 * Conjunctions for a 3D-scene object id (e.g. 'deb-48291').
 * Bridges our scene ids to the scenario catalog ids.
 */
export function getConjunctionsFor(objectId: string): Conjunction[] {
  if (objectId === 'deb-48291') return UPCOMING_CONJUNCTIONS_FOR_DEB_48291;
  if (objectId === 'iss') {
    return [
      {
        id: 'CONJ-ISS-DEB',
        primaryId: 'ISS-ZARYA',
        secondaryId: 'DEB-48291',
        tcaIso: MAIN_CONJUNCTION.tcaIso,
        missDistanceKm: MAIN_CONJUNCTION.missDistanceKm,
        predictedMissKm: MAIN_CONJUNCTION.predictedMissKm,
        relativeVelocityKmS: MAIN_CONJUNCTION.relativeVelocityKmS,
        risk: 'HIGH',
        confidence: 0.92,
        summary: 'Retrograde debris crossing the ISS protected zone.',
      },
    ];
  }
  return [
    {
      id: `CONJ-${objectId}-REF`,
      primaryId: objectId,
      secondaryId: 'ISS-ZARYA',
      tcaIso: new Date(Date.now() + 48 * 3600_000).toISOString(),
      missDistanceKm: 18.5,
      relativeVelocityKmS: 7.8,
      risk: 'LOW',
      confidence: 0.4,
      summary: 'Reference conjunction window. No action required.',
    },
  ];
}
