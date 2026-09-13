import { create } from 'zustand';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';

export type ZoomLevel = 'system' | 'planetary' | 'regional' | 'close';
export type RiskLevel = 'SAFE' | 'LOW' | 'WATCH' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface PlanetInfo {
  id: string;
  name: string;
}

export interface Satellite {
  id: string;
  noradId: string;
  name: string;
  operator?: string;
  category: string;
  position: [number, number, number];
  velocity?: [number, number, number];
  altitudeKm: number;
  velocityKmS: number;
  inclinationDeg: number;
  orbitalPeriodMin: number;
  risk: RiskLevel;
  isDebris?: boolean;
}

export interface Conjunction {
  id: string;
  primaryId: string;
  secondaryId: string;
  tcaIso: string;
  missDistanceKm: number;
  predictedMissKm?: number;
  relativeVelocityKmS: number;
  risk: Exclude<RiskLevel, 'SAFE' | 'CRITICAL'>;
  confidence: number;
  summary: string;
}

export interface ManeuverValues {
  deltaVMs: number;
  direction: string;
  executionIso: string;
  newMissKm: number;
  improvementPct: number;
  factors: { label: string; pct: number }[];
  whyText: string;
}

export interface OrbitGuardState {
  // view toggles
  showOrbits: boolean;
  showDebris: boolean;
  showLabels: boolean;
  showTrails: boolean;

  // selection
  selectedPlanet: string | null;
  selectedSatellite: string | null;

  // camera
  zoomLevel: ZoomLevel;
  cameraDistanceToEarth: number;

  // controls ref
  controlsRef: React.RefObject<OrbitControlsImpl> | null;

  // alerts
  conjunctionMode: boolean;
  selectedConjunction: Conjunction | null;
  maneuverRunning: boolean;

  // actions
  toggleOrbits: () => void;
  toggleDebris: () => void;
  toggleLabels: () => void;
  toggleTrails: () => void;
  setSelectedPlanet: (p: string | null) => void;
  setSelectedSatellite: (id: string | null) => void;
  setZoomLevel: (z: ZoomLevel, d?: number) => void;
  setControlsRef: (ref: React.RefObject<OrbitControlsImpl> | null) => void;
  triggerAlert: (c: Conjunction) => void;
  dismissAlert: () => void;
  setManeuverRunning: (v: boolean) => void;
}

export const useOrbitGuard = create<OrbitGuardState>((set) => ({
  showOrbits: true,
  showDebris: true,
  showLabels: true,
  showTrails: true,

  selectedPlanet: null,
  selectedSatellite: null,

  zoomLevel: 'system',
  cameraDistanceToEarth: 80,

  controlsRef: null,

  conjunctionMode: false,
  selectedConjunction: null,
  maneuverRunning: false,

  toggleOrbits: () => set((s) => ({ showOrbits: !s.showOrbits })),
  toggleDebris: () => set((s) => ({ showDebris: !s.showDebris })),
  toggleLabels: () => set((s) => ({ showLabels: !s.showLabels })),
  toggleTrails: () => set((s) => ({ showTrails: !s.showTrails })),

  setSelectedPlanet: (p) => set({ selectedPlanet: p, selectedSatellite: null, conjunctionMode: false }),
  setSelectedSatellite: (id) => set({ selectedSatellite: id }),
  setZoomLevel: (z, d) => set({ zoomLevel: z, cameraDistanceToEarth: d ?? (z === 'close' ? 8 : z === 'regional' ? 18 : z === 'planetary' ? 35 : 80) }),
  setControlsRef: (ref) => set({ controlsRef: ref }),

  triggerAlert: (c) => set({ conjunctionMode: true, selectedConjunction: c, selectedSatellite: c.secondaryId }),
  dismissAlert: () => set({ conjunctionMode: false }),
  setManeuverRunning: (v) => set({ maneuverRunning: v }),
}));
