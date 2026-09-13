import { Conjunction, ManeuverValues, RiskLevel, Satellite } from '../store/orbitGuard';

// Deterministic pseudo-random for stable layouts
function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = seed;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rand = mulberry32(42);

export const SATELLITE_IDS = {
  ISS: 'ISS-ZARYA',
  HST: 'HUBBLE',
  DEB_CRITICAL: 'DEB-48291',
  STARLINK_1: 'STARLINK-3176',
  FENGYUN: 'FENGYUN-1C',
  COSMOS: 'COSMOS-2345',
  GPS_1: 'GPS-BIIF-12',
  NOAA: 'NOAA-19',
  TIANHE: 'TIANHE-CORE',
  CHANDRAYAAN: 'CHANDRAYAAN-3',
  ADITYA: 'ADITYA-L1',
  SENTINEL: 'SENTINEL-6A',
  LANDSAT: 'LANDSAT-9',
  JWST: null as null,
} as const;

export const MAJOR_SATELLITES: Satellite[] = [
  {
    id: SATELLITE_IDS.ISS,
    noradId: '25544',
    name: 'ISS (ZARYA)',
    operator: 'NASA / Roscosmos / ESA / JAXA / CSA',
    category: 'station_crew',
    position: [15, 0.12, 0.12],
    altitudeKm: 408,
    velocityKmS: 7.66,
    inclinationDeg: 51.6,
    orbitalPeriodMin: 92.7,
    risk: 'SAFE',
  },
  {
    id: SATELLITE_IDS.HST,
    noradId: '20580',
    name: 'Hubble Space Telescope',
    operator: 'NASA / ESA',
    category: 'science',
    position: [15.12, 0.08, -0.14],
    altitudeKm: 540,
    velocityKmS: 7.57,
    inclinationDeg: 28.5,
    orbitalPeriodMin: 95.4,
    risk: 'SAFE',
  },
  {
    id: SATELLITE_IDS.DEB_CRITICAL,
    noradId: '48291',
    name: 'DEB-48291',
    operator: 'Unknown',
    category: 'debris',
    position: [14.92, -0.1, 0.16],
    altitudeKm: 742,
    velocityKmS: 7.62,
    inclinationDeg: 98.7,
    orbitalPeriodMin: 99.6,
    risk: 'CRITICAL',
    isDebris: true,
  },
  {
    id: SATELLITE_IDS.STARLINK_1,
    noradId: '44714',
    name: 'Starlink-3176',
    operator: 'SpaceX',
    category: 'comms',
    position: [15.1, -0.07, -0.12],
    altitudeKm: 550,
    velocityKmS: 7.56,
    inclinationDeg: 53.0,
    orbitalPeriodMin: 95.6,
    risk: 'LOW',
  },
  {
    id: SATELLITE_IDS.FENGYUN,
    noradId: '33110',
    name: 'FENGYUN-1C',
    operator: 'CNSA',
    category: 'debris',
    position: [14.96, 0.14, -0.04],
    altitudeKm: 863,
    velocityKmS: 7.42,
    inclinationDeg: 98.8,
    orbitalPeriodMin: 102.4,
    risk: 'MEDIUM',
    isDebris: true,
  },
  {
    id: SATELLITE_IDS.COSMOS,
    noradId: '22675',
    name: 'COSMOS-2345',
    operator: 'Roscosmos',
    category: 'nav',
    position: [15.08, 0.02, 0.18],
    altitudeKm: 800,
    velocityKmS: 7.46,
    inclinationDeg: 82.5,
    orbitalPeriodMin: 101.0,
    risk: 'LOW',
  },
  {
    id: SATELLITE_IDS.GPS_1,
    noradId: '48859',
    name: 'GPS III SV07',
    operator: 'USSF',
    category: 'navigation',
    position: [15.0, -0.13, -0.08],
    altitudeKm: 20180,
    velocityKmS: 3.89,
    inclinationDeg: 55.0,
    orbitalPeriodMin: 720,
    risk: 'SAFE',
  },
  {
    id: SATELLITE_IDS.NOAA,
    noradId: '33591',
    name: 'NOAA-19',
    operator: 'NOAA',
    category: 'weather',
    position: [15.05, 0.11, 0.04],
    altitudeKm: 850,
    velocityKmS: 7.41,
    inclinationDeg: 99.0,
    orbitalPeriodMin: 102.0,
    risk: 'WATCH',
  },
  {
    id: SATELLITE_IDS.TIANHE,
    noradId: '48274',
    name: 'Tianhe Core Module',
    operator: 'CMSA',
    category: 'station_crew',
    position: [14.93, -0.05, 0.08],
    altitudeKm: 390,
    velocityKmS: 7.68,
    inclinationDeg: 41.5,
    orbitalPeriodMin: 92.3,
    risk: 'SAFE',
  },
  {
    id: SATELLITE_IDS.CHANDRAYAAN,
    noradId: '57320',
    name: 'Chandrayaan-3',
    operator: 'ISRO',
    category: 'science',
    position: [15.14, 0.04, -0.06],
    altitudeKm: 100,
    velocityKmS: 1.68,
    inclinationDeg: 0.0,
    orbitalPeriodMin: 120,
    risk: 'SAFE',
  },
  {
    id: SATELLITE_IDS.SENTINEL,
    noradId: '48414',
    name: 'Sentinel-6A',
    operator: 'ESA / NASA',
    category: 'earth',
    position: [14.98, -0.15, 0.06],
    altitudeKm: 1336,
    velocityKmS: 7.15,
    inclinationDeg: 66.0,
    orbitalPeriodMin: 112.3,
    risk: 'SAFE',
  },
  {
    id: SATELLITE_IDS.LANDSAT,
    noradId: '51656',
    name: 'Landsat 9',
    operator: 'USGS / NASA',
    category: 'earth',
    position: [15.07, -0.03, -0.17],
    altitudeKm: 705,
    velocityKmS: 7.45,
    inclinationDeg: 98.2,
    orbitalPeriodMin: 98.8,
    risk: 'SAFE',
  },
  {
    id: 'STARLINK-1041',
    noradId: '44747',
    name: 'Starlink-1041',
    operator: 'SpaceX',
    category: 'comms',
    position: [14.88, 0.06, -0.13],
    altitudeKm: 550,
    velocityKmS: 7.56,
    inclinationDeg: 53.0,
    orbitalPeriodMin: 95.6,
    risk: 'SAFE',
  },
  {
    id: 'STARLINK-1062',
    noradId: '44768',
    name: 'Starlink-1062',
    operator: 'SpaceX',
    category: 'comms',
    position: [15.12, 0.1, 0.08],
    altitudeKm: 550,
    velocityKmS: 7.56,
    inclinationDeg: 53.0,
    orbitalPeriodMin: 95.6,
    risk: 'SAFE',
  },
  {
    id: 'COSMOS-2251-DEB',
    noradId: '33757',
    name: 'COSMOS 2251 DEB',
    operator: 'Roscosmos',
    category: 'debris',
    position: [14.94, 0.13, 0.14],
    altitudeKm: 790,
    velocityKmS: 7.47,
    inclinationDeg: 74.0,
    orbitalPeriodMin: 100.7,
    risk: 'HIGH',
    isDebris: true,
  },
  {
    id: 'DEB-48231',
    noradId: '48231',
    name: 'DEB-48231',
    operator: 'Unknown',
    category: 'debris',
    position: [15.16, -0.08, 0.02],
    altitudeKm: 500,
    velocityKmS: 7.61,
    inclinationDeg: 82.0,
    orbitalPeriodMin: 94.5,
    risk: 'MEDIUM',
    isDebris: true,
  },
  {
    id: 'DEB-44100',
    noradId: '44100',
    name: 'DEB-44100',
    operator: 'Unknown',
    category: 'debris',
    position: [14.9, -0.12, -0.03],
    altitudeKm: 620,
    velocityKmS: 7.54,
    inclinationDeg: 97.0,
    orbitalPeriodMin: 97.1,
    risk: 'LOW',
    isDebris: true,
  },
  {
    id: 'ONEWEB-0138',
    noradId: '47723',
    name: 'OneWeb-0138',
    operator: 'OneWeb',
    category: 'comms',
    position: [15.04, -0.01, 0.17],
    altitudeKm: 1200,
    velocityKmS: 7.23,
    inclinationDeg: 87.9,
    orbitalPeriodMin: 109.6,
    risk: 'SAFE',
  },
  {
    id: 'IRIDIUM-NEXT-12',
    noradId: '43178',
    name: 'Iridium NEXT 12',
    operator: 'Iridium',
    category: 'comms',
    position: [15.02, 0.15, -0.09],
    altitudeKm: 780,
    velocityKmS: 7.47,
    inclinationDeg: 86.4,
    orbitalPeriodMin: 100.4,
    risk: 'SAFE',
  },
  {
    id: 'DEB-48293',
    noradId: '48293',
    name: 'DEB-48293',
    operator: 'Unknown',
    category: 'debris',
    position: [14.96, -0.07, 0.15],
    altitudeKm: 732,
    velocityKmS: 7.50,
    inclinationDeg: 98.2,
    orbitalPeriodMin: 99.4,
    risk: 'HIGH',
    isDebris: true,
  },
];

// Build 500 constellation/debris samples around Earth (distance ~15)
function buildConstellationSamples(n: number): Satellite[] {
  const out: Satellite[] = [];
  for (let i = 0; i < n; i++) {
    const theta = rand() * Math.PI * 2;
    const phi = Math.acos(2 * rand() - 1);
    const r = 1.005 + rand() * 0.02; // near LEO/MEO sphere radius around Earth orbit
    const x = 15 + Math.cos(theta) * Math.sin(phi) * r;
    const y = Math.sin(theta) * Math.sin(phi) * r * 0.4;
    const z = Math.cos(phi) * r;
    const roll = rand();
    const risk: RiskLevel =
      roll < 0.02 ? 'CRITICAL'
      : roll < 0.07 ? 'HIGH'
      : roll < 0.18 ? 'MEDIUM'
      : roll < 0.35 ? 'WATCH'
      : 'SAFE';
    const isDebris = rand() < 0.55;
    out.push({
      id: `SAMP-${i}`,
      noradId: `${40000 + i}`,
      name: isDebris ? `DEB-${40000 + i}` : `SAT-${40000 + i}`,
      category: isDebris ? 'debris' : 'comms',
      position: [x, y, z],
      altitudeKm: 300 + rand() * 2500,
      velocityKmS: 6.5 + rand() * 1.5,
      inclinationDeg: rand() * 120,
      orbitalPeriodMin: 90 + rand() * 400,
      risk,
      isDebris,
    });
  }
  return out;
}

export const CONSTELLATION_SAMPLES: Satellite[] = buildConstellationSamples(500);

export function buildDebrisPoints(n = 34218): { positions: Float32Array; colors: Float32Array; count: number } {
  const positions = new Float32Array(n * 3);
  const colors = new Float32Array(n * 3);
  const riskColors: Record<RiskLevel, [number, number, number]> = {
    SAFE:     [0.13, 0.77, 0.37],
    LOW:      [0.13, 0.77, 0.37],
    WATCH:    [0.92, 0.70, 0.03],
    MEDIUM:   [0.97, 0.45, 0.09],
    HIGH:     [0.94, 0.27, 0.27],
    CRITICAL: [0.86, 0.15, 0.15],
  };
  for (let i = 0; i < n; i++) {
    const theta = rand() * Math.PI * 2;
    const phi = Math.acos(2 * rand() - 1);
    const r = 1.003 + rand() * 0.028;
    positions[i * 3 + 0] = 15 + Math.cos(theta) * Math.sin(phi) * r;
    positions[i * 3 + 1] = Math.sin(theta) * Math.sin(phi) * r * 0.45;
    positions[i * 3 + 2] = Math.cos(phi) * r;
    const roll = rand();
    const rl: RiskLevel =
      roll < 0.01 ? 'CRITICAL'
      : roll < 0.05 ? 'HIGH'
      : roll < 0.15 ? 'MEDIUM'
      : roll < 0.32 ? 'WATCH'
      : 'SAFE';
    const c = riskColors[rl];
    colors[i * 3 + 0] = c[0];
    colors[i * 3 + 1] = c[1];
    colors[i * 3 + 2] = c[2];
  }
  return { positions, colors, count: n };
}

// ========= Conjunctions ==========

// Main demo: DEB-48291 vs ISS
const TCA_DEB_ISS = new Date(Date.now() + 42 * 60_000 + 17_000).toISOString();

export const MAIN_CONJUNCTION: Conjunction = {
  id: 'CONJ-DEB48291-ISS',
  primaryId: SATELLITE_IDS.DEB_CRITICAL,
  secondaryId: SATELLITE_IDS.ISS,
  tcaIso: TCA_DEB_ISS,
  missDistanceKm: 12.4,
  predictedMissKm: 0.32,
  relativeVelocityKmS: 7.62,
  risk: 'HIGH',
  confidence: 0.92,
  summary: 'ISS (ZARYA) — Retrograde LEO debris crossing at 98° inclination.',
};

// Conjunctions shown in Intelligence Panel for DEB-48291
export const UPCOMING_CONJUNCTIONS_FOR_DEB_48291: Conjunction[] = [
  MAIN_CONJUNCTION,
  {
    id: 'CONJ-DEB48291-FY',
    primaryId: SATELLITE_IDS.DEB_CRITICAL,
    secondaryId: SATELLITE_IDS.FENGYUN,
    tcaIso: new Date(Date.now() + (13 * 3600 + 5 * 60 + 32) * 1000).toISOString(),
    missDistanceKm: 2.4,
    predictedMissKm: 1.9,
    relativeVelocityKmS: 14.2,
    risk: 'MEDIUM',
    confidence: 0.76,
    summary: 'FENGYUN-1C debris cloud crossing.',
  },
  {
    id: 'CONJ-DEB48291-STARLINK',
    primaryId: SATELLITE_IDS.DEB_CRITICAL,
    secondaryId: SATELLITE_IDS.STARLINK_1,
    tcaIso: new Date(Date.now() + (13 * 3600 + 11 * 60 + 7) * 1000).toISOString(),
    missDistanceKm: 4.8,
    predictedMissKm: 4.2,
    relativeVelocityKmS: 11.9,
    risk: 'LOW',
    confidence: 0.54,
    summary: 'Near-opposite orbits, Starlink has maneuver margin.',
  },
  {
    id: 'CONJ-DEB48291-COSMOS',
    primaryId: SATELLITE_IDS.DEB_CRITICAL,
    secondaryId: SATELLITE_IDS.COSMOS,
    tcaIso: new Date(Date.now() + (14 * 3600 + 3 * 60 + 21) * 1000).toISOString(),
    missDistanceKm: 7.6,
    predictedMissKm: 6.9,
    relativeVelocityKmS: 10.8,
    risk: 'LOW',
    confidence: 0.48,
    summary: 'COSMOS navigation constellation. Low confidence far-term.',
  },
  {
    id: 'CONJ-DEB48291-SELF',
    primaryId: SATELLITE_IDS.DEB_CRITICAL,
    secondaryId: 'DEB-48293',
    tcaIso: new Date(Date.now() + (14 * 3600 + 9 * 60 + 16) * 1000).toISOString(),
    missDistanceKm: 12.3,
    predictedMissKm: 11.8,
    relativeVelocityKmS: 9.4,
    risk: 'LOW',
    confidence: 0.32,
    summary: 'Debris-on-debris. Unmaneuverable pair.',
  },
];

export const getConjunctionsForSatellite = (satId: string): Conjunction[] => {
  if (satId === SATELLITE_IDS.DEB_CRITICAL) return UPCOMING_CONJUNCTIONS_FOR_DEB_48291;
  // Generic fallback: return ISS as a single low-risk reference
  return [
    {
      id: `CONJ-${satId}-REF`,
      primaryId: satId,
      secondaryId: SATELLITE_IDS.ISS,
      tcaIso: new Date(Date.now() + 48 * 3600_000).toISOString(),
      missDistanceKm: 18.5,
      predictedMissKm: 17.0,
      relativeVelocityKmS: 7.8,
      risk: 'LOW',
      confidence: 0.4,
      summary: 'Reference conjunction window. No action required.',
    },
  ];
};

// ========= Maneuver values for the main demo ==========
export const MANEUVER_FOR_DEB_ISS: ManeuverValues = {
  deltaVMs: 2.4,
  direction: 'Retrograde',
  executionIso: new Date(Date.now() + (5 * 3600 + 12 * 60) * 1000).toISOString(),
  newMissKm: 1.8,
  improvementPct: 86,
  whyText:
    'The objects are in near-opposite orbits with a converging trajectory crossing at a critical angle with minimal separation in 1.2 hours. The current TLE accuracy and uncertainty window increases the risk of collision.',
  factors: [
    { label: 'Low miss distance', pct: 45 },
    { label: 'High relative velocity', pct: 32 },
    { label: 'Orbital plane intersection', pct: 23 },
  ],
};

export function getManeuverForSatellite(_satId: string, conj?: Conjunction | null): ManeuverValues {
  if (!conj) return MANEUVER_FOR_DEB_ISS;
  const base = 1 - Math.min(1, conj.predictedMissKm ?? conj.missDistanceKm / 10);
  return {
    deltaVMs: +(1.0 + base * 2.2).toFixed(2),
    direction: conj.predictedMissKm && conj.predictedMissKm < 0.5 ? 'Radial Out' : 'Retrograde',
    executionIso: conj.tcaIso,
    newMissKm: +Math.max(0.8, (conj.predictedMissKm ?? conj.missDistanceKm) * 5.3).toFixed(2),
    improvementPct: Math.round(70 + base * 26),
    whyText: MANEUVER_FOR_DEB_ISS.whyText,
    factors: MANEUVER_FOR_DEB_ISS.factors,
  };
}

// Satellite-by-id lookup
export const ALL_SATELLITES_BY_ID: Record<string, Satellite> = Object.fromEntries(
  [...MAJOR_SATELLITES].map((s) => [s.id, s])
);

// Active alerts summary (topbar stats)
export const GLOBAL_STATS = {
  trackedObjects: 34218,
  activeAlerts: 12,
  collisionRisks: 3,
};
