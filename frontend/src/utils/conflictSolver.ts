import { ConjunctionEvent } from '../services/api';

export type ConflictOption = 'A' | 'B' | 'C' | 'D';

export interface SatProfile {
  id: string;
  name: string;
  noradId: string;
  criticalityScore: number;
  fuelMarginPct: number;
  maneuverable: boolean;
  category: 'station' | 'crew' | 'science' | 'navigation' | 'comms' | 'debris';
  operator?: string;
}

export interface ConflictResolutionResult {
  satelliteA: SatProfile;
  satelliteB: SatProfile;
  options: Record<ConflictOption, { label: string; description: string; score: number }>;
  recommended: ConflictOption;
  rationale: string;
  maneuverDeltaV: number;
  whoManeuvers: string;
  whoHolds: string;
  deltaVA: number;
  deltaVB: number;
}

const CREW_PRIORITY = 999;
const SCIENCE_PRIORITY = 500;
const NAV_PRIORITY = 400;
const COMMS_PRIORITY = 100;
const DEBRIS_PRIORITY = 0;

function categorize(norad: string, name: string): SatProfile['category'] {
  const n = name.toUpperCase();
  if (n.includes('ISS') || n.includes('TIANGONG') || norad === '25544') return 'station';
  if (n.includes('DRAGON') || n.includes('SOYUZ')) return 'crew';
  if (n.includes('HUBBLE') || n.includes('JWST') || n.includes('SCI')) return 'science';
  if (n.includes('GPS') || n.includes('GALILEO') || n.includes('GLONASS')) return 'navigation';
  if (n.includes('DEB') || n.includes('COSMOS 2251') || n.includes('FENGYUN')) return 'debris';
  return 'comms';
}

function buildSatProfile(norad: string, name: string, operator?: string): SatProfile {
  const cat = categorize(norad, name);
  let baseCrit = 0;
  if (cat === 'station') baseCrit = CREW_PRIORITY;
  else if (cat === 'crew') baseCrit = CREW_PRIORITY - 50;
  else if (cat === 'science') baseCrit = SCIENCE_PRIORITY;
  else if (cat === 'navigation') baseCrit = NAV_PRIORITY;
  else if (cat === 'comms') baseCrit = COMMS_PRIORITY;
  else baseCrit = DEBRIS_PRIORITY;

  const nHash = [...norad].reduce((a, c) => a + c.charCodeAt(0), 0);
  const fuel = cat === 'debris' ? 0 : 10 + (nHash % 85);
  const maneuverable = cat !== 'debris';

  const criticalityScore = Math.min(100, Math.max(0,
    Math.floor((baseCrit > 100 ? 60 + (baseCrit - 100) / 30 : baseCrit / 5)) + (nHash % 25) - 10
  ));

  return {
    id: norad,
    noradId: norad,
    name,
    category: cat,
    fuelMarginPct: fuel,
    maneuverable,
    criticalityScore,
    operator,
  };
}

export function solveConflict(ev: ConjunctionEvent, knownNames: Record<string, string>): ConflictResolutionResult | null {
  const nameA = knownNames[ev.norad_id_primary] ?? `SAT-${ev.norad_id_primary}`;
  const nameB = knownNames[ev.norad_id_secondary] ?? `SAT-${ev.norad_id_secondary}`;

  const a = buildSatProfile(ev.norad_id_primary, nameA);
  const b = buildSatProfile(ev.norad_id_secondary, nameB);

  if (!a.maneuverable && !b.maneuverable) {
    const options: ConflictResolutionResult['options'] = {
      A: { label: `${a.name} dodges (impossible)`, description: 'Primary object is debris — unmaneuverable.', score: 0 },
      B: { label: `${b.name} dodges (impossible)`, description: 'Secondary object is debris — unmaneuverable.', score: 0 },
      C: { label: 'Both dodge (⚠ UNSAFE)', description: 'ISRO policy forbids uncoordinated dual maneuvers.', score: 2 },
      D: { label: 'Neither dodges — collision at TCA', description: 'No controllable object can maneuver; external mitigation required.', score: 4 },
    };
    return {
      satelliteA: a, satelliteB: b,
      options, recommended: 'D',
      rationale: 'Neither object is controllable (debris vs debris). External debris removal or shielding required.',
      maneuverDeltaV: 0, whoManeuvers: 'N/A', whoHolds: `${a.name} & ${b.name}`, deltaVA: 0, deltaVB: 0,
    };
  }

  const deltaVA = +Math.max(0.08, 0.8 - a.fuelMarginPct / 140).toFixed(2);
  const deltaVB = +Math.max(0.08, 0.8 - b.fuelMarginPct / 140).toFixed(2);

  const aShouldHoldScore = a.criticalityScore * 2 + (100 - a.fuelMarginPct);
  const bShouldHoldScore = b.criticalityScore * 2 + (100 - b.fuelMarginPct);

  let recommended: ConflictOption = 'A';
  let whoManeuvers = a.name;
  let whoHolds = b.name;
  let maneuverDeltaV = deltaVA;

  if (a.maneuverable && !b.maneuverable) {
    recommended = 'A'; whoManeuvers = a.name; whoHolds = b.name; maneuverDeltaV = deltaVA;
  } else if (!a.maneuverable && b.maneuverable) {
    recommended = 'B'; whoManeuvers = b.name; whoHolds = a.name; maneuverDeltaV = deltaVB;
  } else if (aShouldHoldScore > bShouldHoldScore) {
    recommended = 'B'; whoManeuvers = b.name; whoHolds = a.name; maneuverDeltaV = deltaVB;
  } else {
    recommended = 'A'; whoManeuvers = a.name; whoHolds = b.name; maneuverDeltaV = deltaVA;
  }

  const rationale = `RECOMMEND: ${whoManeuvers} performs a ${maneuverDeltaV.toFixed(2)} m/s burn. ${whoHolds} holds course.\n` +
    `Rationale (ISRO CAM protocol): exactly ONE satellite maneuvers per conjunction to avoid post-maneuver re-collision.\n` +
    `Priority analysis: ${a.name} (criticality=${a.criticalityScore}, fuel=${a.fuelMarginPct}%, category=${a.category}) vs ` +
    `${b.name} (criticality=${b.criticalityScore}, fuel=${b.fuelMarginPct}%, category=${b.category}).\n` +
    `${whoHolds} has higher priority and/or tighter fuel margin → ${whoHolds} holds, ${whoManeuvers} diverges.`;

  const scoreOptionA = a.maneuverable ? (a.fuelMarginPct >= b.fuelMarginPct ? 78 : 54) : 0;
  const scoreOptionB = b.maneuverable ? (b.fuelMarginPct >= a.fuelMarginPct ? 78 : 54) : 0;

  const options: ConflictResolutionResult['options'] = {
    A: { label: `${a.name} dodges, ${b.name} holds`, description: `${a.name} performs ${deltaVA} m/s burn. ${b.name} no action. ${!a.maneuverable ? '⚠️ NOT MANEUVERABLE' : ''}`, score: scoreOptionA },
    B: { label: `${b.name} dodges, ${a.name} holds`, description: `${b.name} performs ${deltaVB} m/s burn. ${a.name} no action. ${!b.maneuverable ? '⚠️ NOT MANEUVERABLE' : ''}`, score: scoreOptionB },
    C: { label: 'Both dodge (⚠ UNSAFE)', description: 'High risk of re-collision in new trajectories (ISRO/NPR 8079.1 forbidden).', score: 14 },
    D: { label: 'Neither dodges — collision at TCA', description: 'No action. Collision probability ≈ ' + ev.pc_foster.toExponential(1) + ' (Foster).', score: 2 },
  };
  if (options[recommended]) options[recommended].score = Math.max(options[recommended].score, 91);

  return { satelliteA: a, satelliteB: b, options, recommended, rationale, maneuverDeltaV, whoManeuvers, whoHolds, deltaVA, deltaVB };
}
