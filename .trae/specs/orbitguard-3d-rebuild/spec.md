# ORBITGUARD — 3D Orbital Collision Avoidance System (Rebuild)

## Problem

The existing NEXORA application uses a 2D Canvas-based globe for orbital visualization. For a hackathon presentation, we need a cinematic 3D-first experience where the Three.js scene is the primary visual surface, with a glassmorphic HTML HUD layered **over** the canvas (not embedded inside it). The experience must tell a complete product story: Solar System → Earth Orbit → Satellite Intelligence → Conjunction Alert → AI Maneuver Simulation.

## Users & Goals

| User | Primary Goal |
|---|---|
| Hackathon Judge | Visually impressive 3D scene → curious enough to interact → impressed by intelligence/animation layers |
| Demo Operator | Smooth click-to-zoom progression, reliable conjunction alert mode, polished maneuver simulation payoff |
| Observer | Reads "orbital collision avoidance" immediately; understands risk reduction visually |

## Non-Goals

- Real orbital physics (SGP4/TLE propagation) — visual/scaled orbits are sufficient for hackathon demo
- Backend integration — demo with hardcoded/seeded data & scenarios
- Mobile polish — desktop-first, tablets degrade gracefully to bottom sheets
- Perfect every planet — prioritize Earth, Sun, then the rest visually

## Functional Requirements

### F1 — 3D Solar System (M1–M2)

`rule` — Full-screen interactive `<Canvas>` renders: Stars (10k–30k Points), nebula/galaxy background planes, glowing Sun with Bloom postprocessing, 8 planets (Mercury→Neptune), orbit rings, and Saturn's rings.

`rule` — Planet orbital motion: each planet revolves around the Sun using `x = cos(θ)*d, z = sin(θ)*d` with `θ += speed*delta`. Speed ratios visually ordered (Mercury fastest → Neptune slowest). Planets also self-rotate.

`rule` — Earth includes a second atmosphere sphere (radius ×1.04) with transparent blue rim shader/material.

`rubric` — Cinematic environment quality (0–4, pass ≥ 2.5):
- 4: Sun corona + bloom reads naturally, Earth has day/night distinction + visible atmosphere rim, Saturn ring has depth, nebula/galaxy provides parallax depth, stars vary in size/opacity and twinkle subtly.
- 3: Bloom level appropriate (UI readable), 8 planets distinguishable by color/size, orbit rings thin cool-blue, starfield dense enough.
- 2: All 8 planets + Sun + orbits present; basic atmosphere on Earth; stars visible; environment is coherent.
- 1: ≥4 planets visible but scene is flat/small.
- 0: Broken or missing scene.

### F2 — Camera & Navigation (M3)

`rule` — `OrbitControls` enabled with damping; user can rotate/zoom/pan. Initial camera position is an angled 3/4 cinematic perspective (not top-down, not side-on) framing the full inner solar system.

`rule` — Auto-rotation: camera slowly orbits the Sun when idle. On first user interaction (`pointerdown`/`wheel`), auto-rotation pauses. Resumes 4 s after interaction stops.

`rule` — Clicking Earth triggers a smooth camera lerp/flight to an Earth-centric view (~20–30 unit distance, framed like screenshot 2). Clicking the Sun/background flies back to system view.

### F3 — HTML HUD Layer (M3)

`rule` — HUD structure is a sibling to `<Canvas>` in the React tree, not inside it:

```
App
├── ThreeCanvas
└── <div absolute inset-0 pointer-events-none>
    ├── TopNav
    ├── EarthInfoCard (top-left)
    ├── StatsPanel (top-right: 34,218 / 12 / 3)
    ├── RightZoomControls
    └── BottomToolbar (Orbits/Debris/Labels/Trails toggles)
```

Each interactive HUD child explicitly opts in with `pointer-events-auto`.

`rubric` — Glassmorphism consistency (0–3, pass ≥ 2):
- 3: Single reusable `.glass` style (rgba deep navy bg 0.72, blur 16, white/0.12 border, soft shadow) applied to every panel; padding/spacing rhythm consistent; brand palette electric-blue/cyan only.
- 2: All panels use the same visual language.
- 1: Mix of styles but still readable.
- 0: Contrast issues or unreadable panels.

### F4 — Zoom-Based Satellite/Object Reveal (M4)

`rule` — Objects around Earth are progressively revealed as a function of camera distance to Earth center:

| distance | visible |
|---|---|
| > 40 | none |
| 30–40 | ~20 major assets (ISS, HST, Starlink samples, a few debris) rendered as individual meshes with labels |
| 10–30 | ~500 constellation/debris objects via `InstancedMesh` or `THREE.Points` |
| < 10 | Full 34,218 debris field via `Points` with risk coloration |

`rule` — Risk color palette: SAFE green, WATCH yellow, MEDIUM orange, HIGH red. CRITICAL objects pulse (animate opacity/size).

### F5 — Object Intelligence (M5)

`rule` — Raycaster + Zustand: clicking an object sets `store.selectedSatellite`. State change triggers:
1. Smooth camera flight to orbit the selected object.
2. Framer Motion slide-in of right-side Intelligence Panel.

`rubric` — Intelligence Panel quality (0–3, pass ≥ 2):
- 3: NORAD ID, operator badge, LIVE TELEMETRY chips (altitude/velocity/inclination with micro sparklines), UPCOMING CONJUNCTIONS list (sorted, risk badges), RECOMMENDED MANEUVER card (Δv + direction + Run Simulation button), AI EXPLANATION with factor bars.
- 2: Telemetry + conjunction list present.
- 1: Just ID + basic info.
- 0: No panel.

### F6 — Conjunction Alert Mode (M6)

`rule` — Zustand `conjunctionMode = true` is a distinct visual state:
- Top red alert banner: `⚠ CONJUNCTION ALERT · HIGH RISK COLLISION DETECTED · T−HH:MM:SS` countdown
- Darker scene overlay with radial red-scan vignette
- Camera flies to frame BOTH objects symmetrically around the predicted collision point
- Dashed trajectories converging with `✕` marker at TCA position
- Side metrics: Current Distance / Predicted Miss Distance / Risk

### F7 — AI Maneuver Simulation (M7)

`rule` — Clicking `RUN SIMULATION` in the intelligence panel plays a 4–6 s sequence:
1. Original trajectories (dashed) visible, predicted collision cross marker at TCA.
2. A burn point appears on the dodging satellite's path (retrograde Δv).
3. Post-burn trajectory animates, miss-distance counter animates from e.g. 320m → 3.2km.
4. Risk badge transitions: CRITICAL → HIGH → MEDIUM → SAFE.
5. Improvement banner (e.g. "+86% improvement, Δv 2.4 m/s") confirms success.

`rubric` — Demo payoff impact (0–4, pass ≥ 2.5):
- 4: Animation choreographed, camera follows burn, metrics animate smoothly, risk transition clear, audience reaction "oh nice".
- 3: All sequence steps execute in order; before/after readable; counter animates.
- 2: Static before/after comparison with at least animated miss-distance.
- 1: Button triggers a state change but minimal animation.
- 0: Button absent/broken.

## Non-Functional Requirements

### NF1 — Tech Stack

`rule` — Dependencies exactly: React + Vite + TypeScript + Three.js + @react-three/fiber + @react-three/drei + @react-three/postprocessing + Framer Motion + Tailwind + Zustand.

### NF2 — TypeScript

`rule` — `npx tsc --noEmit` exits 0. No `any` casts for Three.js Line/SVG conflicts (specific typing where feasible, `unknown` + narrow as fallback).

### NF3 — Build

`rule` — `npm run build` produces a working dist; chunk warnings allowed but not errors.

### NF4 — Performance

`rule` — Desktop 60 fps target on a mid-range GPU (GTX 1660 class). Profiling strategy: large object sets use Points/InstancedMesh, never thousands of individual `<mesh>`. LOD pattern: only selected object gets a label + full orbit line.

### NF5 — Directory Layout

`rule` — Source tree structure agreed by spec:

```
frontend/src/
├── App.tsx
├── components/
│   ├── scene/              (ThreeCanvas, Stars, Nebula, Sun)
│   ├── planets/            (Planet, OrbitRing, SaturnRing, EarthAtmosphere)
│   ├── objects/            (SatelliteField, DebrisField, SelectedObjectMarker)
│   ├── ui/                 (TopNav, EarthInfoCard, StatsPanel, BottomToolbar, ZoomControls)
│   ├── panels/             (IntelligencePanel, ConjunctionAlertBanner, ManeuverOverlay)
│   └── effects/            (Bloom, Scanline)
├── data/planets.ts
├── hooks/useCameraDistance.ts / useAutoRotate.ts
├── store/orbitGuard.ts     (Zustand: selectedPlanet, showOrbits, showDebris, showLabels, showTrails, selectedSatellite, conjunctionMode, selectedConjunction, maneuverRunning)
└── services/scenarios.ts   (Hardcoded demo satellite/debris/conjunction datasets)
```

## Constraints & Dependencies

- Existing Nexora frontend must be replaced in-place (same `frontend/` directory).
- Preserve the existing Nexora backend contracts where possible, but demo data can live client-side.
- No new MCP servers; standard toolchain only.
- Planet textures: ideally use procedural or solid color + normal approximation for hackathon speed. If texture time is available: Earth day + night + clouds (cloud sphere at 1.02 radius with alpha).

## Assumptions

- Distances are **visual units**, not kilometers: `distance ∈ {8,11,15,20,30,40,50,60}` for Mercury→Neptune.
- Screenshot-1 composition is the desktop default. Screenshot-2 is the post-Earth-click state.
- A single pre-seeded "DEB-48291 vs ISS" conjunction scenario drives M6/M7 for the main demo path.

## Open Questions

- Q: Do we keep the old NEXORA components accessible (e.g., route `/legacy`)? → A: No, replace the main app entirely for this hackathon build.
- Q: Backend required live for demo? → A: No, seed demo data in `services/scenarios.ts`. Optional graceful fetch-fallback for presentation.
