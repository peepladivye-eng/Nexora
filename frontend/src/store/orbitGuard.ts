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

export interface FocusRequest {
  kind: 'planet' | 'earth-orbit' | 'satellite' | 'overview';
  id: string;
  /** desired camera distance from the target, in visual units */
  distance?: number;
  /** monotonically increasing nonce so repeated clicks still trigger flights */
  nonce: number;
}

export interface SelectedSatInfo {
  id: string;
  name: string;
  noradId: string;
  operator?: string;
  risk: RiskLevel;
  isDebris?: boolean;
  altitudeKm: number;
  velocityKmS: number;
  inclinationDeg: number;
  orbitalPeriodMin: number;
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
  satInfo: SelectedSatInfo | null;

  // camera
  zoomLevel: ZoomLevel;
  cameraDistanceToEarth: number;

  // camera focus requests (consumed by CameraDirector)
  focus: FocusRequest | null;
  /** pending discrete zoom command from UI controls */
  zoomCommand: 'in' | 'out' | null;

  // controls ref
  controlsRef: React.RefObject<OrbitControlsImpl> | null;

  // alerts
  conjunctionMode: boolean;
  selectedConjunction: Conjunction | null;
  maneuverRunning: boolean;
  /** progress of the maneuver simulation 0..1 (drives the 3D trajectory) */
  simProgress: number;

  // global stats (scenario-swappable)
  stats: { trackedObjects: number; activeAlerts: number; collisionRisks: number };

  // floating side panels (one at a time)
  activePanel: 'objects' | 'scenarios' | 'analytics' | 'settings' | 'about' | null;

  // demo scenario currently applied
  activeScenario: string | null;

  // simulation clock
  simPaused: boolean;
  simSpeed: number;

  // camera auto-rotate preference
  autoRotate: boolean;

  // debris risk-tier visibility (toggled from the legend)
  riskMask: [boolean, boolean, boolean, boolean];

  // actions
  toggleOrbits: () => void;
  toggleDebris: () => void;
  toggleLabels: () => void;
  toggleTrails: () => void;
  setSelectedPlanet: (p: string | null) => void;
  setSelectedSatellite: (id: string | null) => void;
  setSatInfo: (info: SelectedSatInfo | null) => void;
  focusPlanet: (id: string) => void;
  focusEarthOrbit: (distance?: number) => void;
  focusSatellite: (id: string, info?: SelectedSatInfo) => void;
  requestOverview: () => void;
  zoomIn: () => void;
  zoomOut: () => void;
  consumeZoomCommand: () => void;
  setZoomLevel: (z: ZoomLevel, d?: number) => void;
  setControlsRef: (ref: React.RefObject<OrbitControlsImpl> | null) => void;
  triggerAlert: (c: Conjunction) => void;
  dismissAlert: () => void;
  setManeuverRunning: (v: boolean) => void;
  setSimProgress: (p: number) => void;
  updateSelectedConjunction: (patch: Partial<Conjunction>) => void;
  clearSelection: () => void;
  setStats: (s: Partial<{ trackedObjects: number; activeAlerts: number; collisionRisks: number }>) => void;
  openPanel: (p: 'objects' | 'scenarios' | 'analytics' | 'settings' | 'about' | null) => void;
  setScenario: (id: string | null) => void;
  togglePause: () => void;
  setSimSpeed: (n: number) => void;
  setAutoRotate: (v: boolean) => void;
  toggleRiskTier: (i: number) => void;
}

export const useOrbitGuard = create<OrbitGuardState>((set) => {
  // Helper to convert scenario satellite ID to scene ID and create satInfo
  const buildSatInfo = (satId: string, risk: RiskLevel): SelectedSatInfo => {
    const idMap: Record<string, { sceneId: string; name: string; noradId: string; operator?: string; altKm: number; velKmS: number; inc: number; period: number; isDebris?: boolean }> = {
      'ISS-ZARYA': { sceneId: 'iss', name: 'ISS (ZARYA)', noradId: '25544', operator: 'NASA / Roscosmos', altKm: 408, velKmS: 7.66, inc: 51.6, period: 92.9 },
      'DEB-48291': { sceneId: 'deb-48291', name: 'DEB-48291', noradId: '48291', altKm: 742, velKmS: 7.62, inc: 98.7, period: 98.6, isDebris: true },
      'HUBBLE': { sceneId: 'hubble', name: 'Hubble', noradId: '20580', operator: 'NASA / ESA', altKm: 540, velKmS: 7.59, inc: 28.5, period: 95.4 },
      'STARLINK-3176': { sceneId: 'starlink', name: 'Starlink-3176', noradId: '52976', operator: 'SpaceX', altKm: 550, velKmS: 7.59, inc: 53.0, period: 95.6 },
    };
    const info = idMap[satId] || { sceneId: satId.toLowerCase(), name: satId, noradId: '00000', altKm: 400, velKmS: 7.5, inc: 0, period: 90 };
    return {
      id: info.sceneId,
      name: info.name,
      noradId: info.noradId,
      operator: info.operator,
      risk,
      isDebris: info.isDebris || false,
      altitudeKm: info.altKm,
      velocityKmS: info.velKmS,
      inclinationDeg: info.inc,
      orbitalPeriodMin: info.period,
    };
  };

  return {
  showOrbits: true,
  showDebris: true,
  showLabels: true,
  showTrails: true,

  selectedPlanet: null,
  selectedSatellite: null,
  satInfo: null,

  zoomLevel: 'system',
  cameraDistanceToEarth: 80,

  controlsRef: null,

  focus: null,
  zoomCommand: null,

  conjunctionMode: false,
  selectedConjunction: null,
  maneuverRunning: false,
  simProgress: 0,

  stats: { trackedObjects: 34218, activeAlerts: 12, collisionRisks: 3 },

  activePanel: null,  // Start with no panel open (user can click to open)
  activeScenario: 'typical',  // Load typical scenario by default

  simPaused: false,
  simSpeed: 1,
  autoRotate: true,
  riskMask: [true, true, true, true],

  toggleOrbits: () => set((s) => ({ showOrbits: !s.showOrbits })),
  toggleDebris: () => set((s) => ({ showDebris: !s.showDebris })),
  toggleLabels: () => set((s) => ({ showLabels: !s.showLabels })),
  toggleTrails: () => set((s) => ({ showTrails: !s.showTrails })),

  setSelectedPlanet: (p) => set({ selectedPlanet: p, selectedSatellite: null, conjunctionMode: false }),
  setSelectedSatellite: (id) => set({ selectedSatellite: id }),
  setSatInfo: (info) => set({ satInfo: info }),

  focusPlanet: (id) =>
    set((s) => ({
      selectedPlanet: id,
      selectedSatellite: null,
      focus: { kind: 'planet', id, nonce: s.focus ? s.focus.nonce + 1 : 1 },
    })),
  focusEarthOrbit: (distance) =>
    set((s) => ({
      selectedPlanet: 'earth',
      selectedSatellite: null,
      focus: { kind: 'earth-orbit', id: 'earth', distance, nonce: s.focus ? s.focus.nonce + 1 : 1 },
    })),
  requestOverview: () =>
    set((s) => ({
      selectedPlanet: null,
      selectedSatellite: null,
      satInfo: null,
      focus: { kind: 'overview', id: 'system', nonce: s.focus ? s.focus.nonce + 1 : 1 },
    })),
  focusSatellite: (id, info) =>
    set((s) => ({
      selectedSatellite: id,
      satInfo: info ?? s.satInfo,
      focus: { kind: 'satellite', id, nonce: s.focus ? s.focus.nonce + 1 : 1 },
    })),

  zoomIn: () => set({ zoomCommand: 'in' }),
  zoomOut: () => set({ zoomCommand: 'out' }),
  consumeZoomCommand: () => set({ zoomCommand: null }),
  setZoomLevel: (z, d) => set({ zoomLevel: z, cameraDistanceToEarth: d ?? (z === 'close' ? 8 : z === 'regional' ? 18 : z === 'planetary' ? 35 : 80) }),
  setControlsRef: (ref) => set({ controlsRef: ref }),

  triggerAlert: (c) => set((s) => {
    const satId = c.primaryId ?? c.secondaryId;
    const satInfo = buildSatInfo(satId, c.risk as RiskLevel);
    
    return {
      conjunctionMode: true,
      selectedConjunction: c,
      selectedSatellite: satInfo.id,
      satInfo,
      // fly the camera to a close Earth view — both objects orbit Earth
      focus: { kind: 'earth-orbit', id: 'earth', distance: 3.4, nonce: s.focus ? s.focus.nonce + 1 : 1 },
    };
  }),
  clearSelection: () =>
    set({ selectedPlanet: null, selectedSatellite: null, satInfo: null, focus: null, zoomCommand: null }),
  dismissAlert: () => set({ conjunctionMode: false }),
  setManeuverRunning: (v) => set({ maneuverRunning: v }),
  setSimProgress: (p) => set({ simProgress: p }),
  updateSelectedConjunction: (patch) =>
    set((s) => (s.selectedConjunction
      ? { selectedConjunction: { ...s.selectedConjunction, ...patch } }
      : {})),
  setStats: (patch) => set((s) => ({ stats: { ...s.stats, ...patch } })),
  openPanel: (p) => set((s) => ({ activePanel: s.activePanel === p ? null : p })),
  setScenario: (id) => set({ activeScenario: id }),
  togglePause: () => set((s) => ({ simPaused: !s.simPaused })),
  setSimSpeed: (n) => set({ simSpeed: n, simPaused: false }),
  setAutoRotate: (v) =>
    set((s) => {
      const c = s.controlsRef?.current;
      if (c) c.autoRotate = v;
      return { autoRotate: v };
    }),
  toggleRiskTier: (i) =>
    set((s) => {
      const mask = [...s.riskMask] as [boolean, boolean, boolean, boolean];
      mask[i] = !mask[i];
      return { riskMask: mask };
    }),
  }
});
