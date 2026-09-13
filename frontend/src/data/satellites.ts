import * as THREE from 'three';
import { RiskLevel } from '../store/orbitGuard';

export interface SatConfig {
  id: string;
  name: string;
  noradId: string;
  /** orbital radius around Earth, visual units (Earth radius = 1) */
  orbitRadius: number;
  speed: number;
  phase: number;
  /** orbit plane tilt (x) and rotation (y) in radians */
  tiltX: number;
  tiltY: number;
  color: string;
  size: number;
  risk: RiskLevel;
  isDebris?: boolean;
  operator?: string;
  altitudeKm: number;
  velocityKmS: number;
  inclinationDeg: number;
  orbitalPeriodMin: number;
}

/**
 * Major named objects. Individual meshes + clickable + labeled when close.
 */
export const MAJOR_SATELLITES: SatConfig[] = [
  {
    id: 'iss', name: 'ISS (ZARYA)', noradId: '25544',
    orbitRadius: 1.65, speed: 0.55, phase: 0.4, tiltX: 0.9, tiltY: 0.3,
    color: '#f8fafc', size: 0.075, risk: 'LOW',
    operator: 'NASA / Roscosmos', altitudeKm: 408, velocityKmS: 7.66, inclinationDeg: 51.6, orbitalPeriodMin: 92.9,
  },
  {
    id: 'hubble', name: 'Hubble', noradId: '20580',
    orbitRadius: 1.85, speed: 0.48, phase: 2.4, tiltX: 0.47, tiltY: 1.2,
    color: '#dbeafe', size: 0.055, risk: 'LOW',
    operator: 'NASA / ESA', altitudeKm: 540, velocityKmS: 7.59, inclinationDeg: 28.5, orbitalPeriodMin: 95.4,
  },
  {
    id: 'starlink', name: 'Starlink-3176', noradId: '52976',
    orbitRadius: 1.75, speed: 0.52, phase: 4.6, tiltX: 0.86, tiltY: 2.4,
    color: '#86efac', size: 0.05, risk: 'WATCH',
    operator: 'SpaceX', altitudeKm: 550, velocityKmS: 7.59, inclinationDeg: 53.0, orbitalPeriodMin: 95.6,
  },
  {
    id: 'deb-48291', name: 'DEB-48291', noradId: '48291',
    orbitRadius: 1.7, speed: -0.58, phase: 2.9, tiltX: 1.72, tiltY: 0.2,
    color: '#f87171', size: 0.06, risk: 'CRITICAL', isDebris: true,
    operator: 'Unknown / Debris', altitudeKm: 742, velocityKmS: 7.62, inclinationDeg: 98.7, orbitalPeriodMin: 98.6,
  },
];

export interface DebrisFieldConfig {
  count: number;
  /** [min, max] orbital radius in visual units */
  orbitMin: number;
  orbitMax: number;
}

/**
 * Procedural debris cloud. Rendered as InstancedMesh in DebrisField.
 * Deterministic PRNG so the field is stable across reloads.
 */
export const DEBRIS_FIELD: DebrisFieldConfig = {
  count: 2200,
  orbitMin: 1.35,
  orbitMax: 2.6,
};

export interface DebrisInstance {
  a: number;       // semi-major axis
  phase: number;
  angularSpeed: number;
  tiltX: number;
  tiltY: number;
  wobble: number;  // small out-of-plane offset
  size: number;
  risk: 0 | 1 | 2 | 3; // index into DEBRIS_RISKS
}

export const DEBRIS_RISKS = [
  { label: 'SAFE',   color: '#22c55e' },
  { label: 'WATCH',  color: '#eab308' },
  { label: 'MEDIUM', color: '#f97316' },
  { label: 'HIGH',   color: '#ef4444' },
] as const;

/** display names for registry ids (scene objects + referenced-only objects) */
export const SAT_NAME_BY_ID: Record<string, string> = {
  iss: 'ISS (ZARYA)',
  hubble: 'Hubble',
  starlink: 'STARLINK-6781',
  'deb-48291': 'DEB-48291',
  'deb-fengyun': 'FENGYUN-1C DEB',
  'deb-cosmos': 'COSMOS-2345 DEB',
};

/**
 * Position of a satellite in Earth-local space at time t.
 * Applies tiltX (around X) then tiltY (around Y) — equivalent to nested
 * groups with rotation [tiltX,0,0] inside [0,tiltY,0].
 */
export function satLocalPosition(cfg: SatConfig, t: number, out: THREE.Vector3): THREE.Vector3 {
  const ang = cfg.phase + t * cfg.speed;
  const x0 = Math.cos(ang) * cfg.orbitRadius;
  const z0 = Math.sin(ang) * cfg.orbitRadius;
  const sinX = Math.sin(cfg.tiltX);
  const cosX = Math.cos(cfg.tiltX);
  const sinY = Math.sin(cfg.tiltY);
  const cosY = Math.cos(cfg.tiltY);
  const y1 = -z0 * sinX;
  const z1 = z0 * cosX;
  out.set(
    x0 * cosY + z1 * sinY,
    y1,
    -x0 * sinY + z1 * cosY,
  );
  return out;
}

/** mulberry32 – tiny deterministic PRNG */
export function mulberry32(seed: number) {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

export function generateDebrisInstances(cfg: DebrisFieldConfig): DebrisInstance[] {
  const rnd = mulberry32(0x0c0ffee);
  const out: DebrisInstance[] = [];
  for (let i = 0; i < cfg.count; i++) {
    // Keplerian feel: more objects at lower altitudes
    const a = cfg.orbitMin + (cfg.orbitMax - cfg.orbitMin) * Math.pow(rnd(), 1.4);
    out.push({
      a,
      phase: rnd() * Math.PI * 2,
      angularSpeed: (0.34 + 0.22 * rnd()) / Math.pow(a, 1.5),
      tiltX: rnd() * Math.PI,
      tiltY: rnd() * Math.PI * 2,
      wobble: (rnd() - 0.5) * 0.22,
      size: 0.008 + rnd() * 0.016,
      risk: (rnd() < 0.06 ? 3 : rnd() < 0.16 ? 2 : rnd() < 0.45 ? 1 : 0) as 0 | 1 | 2 | 3,
    });
  }
  return out;
}
