# ORBITGUARD 3D Rebuild — Implementation Tasks

Parent ACs from `spec.md`: F1 (Solar System), F2 (Camera), F3 (HUD), F4 (Satellite Reveal), F5 (Intelligence), F6 (Alert Mode), F7 (Maneuver Sim), NF1–NF5.

---

## Task 1: Bootstrap layout, Zustand store, data files

**Status:** pending

**Priority:** high

**Depends on:** —

**Scope:**
- Create new directory skeleton (`scene/`, `planets/`, `objects/`, `ui/`, `panels/`, `effects/`, `data/`, `hooks/`, `store/`, `services/`)
- `store/orbitGuard.ts` — Zustand store with full interface (all fields in spec)
- `data/planets.ts` — PLANETS config (name, visual distance ∈ {8,11,15,20,30,40,50,60}, radius, speed, color, description, tilt, hasRings)
- `services/scenarios.ts` — Seeding for: 20 major assets, 500 constellation samples, 34,218 debris Points dataset; one pre-seeded DEB-48291 vs ISS conjunction; conjunction list for DEB-48291 intelligence panel
- Update `tailwind.config.js` → add electric-blue / cyan primary palette, telemetry mono font, `.glass` component class
- Update `index.css` → define `.glass` CSS variables + custom scrollbar

**Maps AC:** NF1, NF5

**Test Requirements:**
- `rule`: Store interface matches spec fields. `tsc --noEmit` passes after this task.
- `rule`: PLANETS config has exactly 8 entries; distances sorted ascending.
- `rubric`: Data realism (0–2, pass ≥1): 1=fields populated with demo-friendly values; 2=conjunction scenario includes credible telemetry values and risk ladder.

---

## Task 2: ThreeCanvas + environment (Stars, Nebula, Sun + Bloom)

**Status:** pending

**Priority:** high

**Depends on:** Task 1

**Scope:**
- `components/scene/ThreeCanvas.tsx` — R3F `<Canvas>` with `dpr={[1, 1.5]}`, camera default position (angled 3/4 view, `[45, 35, 70]` approx), `OrbitControls` with damping. Renders `<Stars />`, `<Nebula />`, `<Sun />`, `<AllPlanets />`, `<EarthSatellites />`. Wraps postprocessing `<EffectComposer><Bloom/></EffectComposer>`.
- `components/scene/Stars.tsx` — `THREE.Points`, 15k points, random xyz in 1000-unit sphere, varied size/opacity, subtle per-point opacity oscillation via shader or `useFrame` attribute update.
- `components/scene/Nebula.tsx` — 3-4 large translucent planes (1000u+) with radial gradient textures OR gradient canvas textures at different depths and orientations (purple, blue, orange) for parallax. Keep opacity 0.08-0.18.
- `components/scene/Sun.tsx` — Core sphere R=3, MeshBasicMaterial + emissive warm orange/yellow. Add corona: 2-3 larger additive transparent spheres with scale pulse. Place `<pointLight intensity=2 distance=200 />` at center.
- Use drei `Stars` fallback or custom; Bloom from `@react-three/postprocessing` with `intensity≈0.6, luminanceThreshold≈0.2, mipmapBlur`.

**Maps AC:** F1 (Sun, Stars, Nebula, Bloom), F2 (default camera), NF1, NF4

**Test Requirements:**
- `rule`: `<Canvas>` renders without errors, camera positioned at angled perspective.
- `rule`: Sun is the brightest object; Bloom visible but UI on top remains legible.
- `rubric`: Environment visual quality (0–3, pass ≥1.5): 3=cinematic parallax depth from nebula; 2=dense starfield + corona; 1=present but flat.

---

## Task 3: Planet system (8 planets + OrbitRing + Saturn rings + Earth atmosphere + motion)

**Status:** pending

**Priority:** high

**Depends on:** Task 2

**Scope:**
- `components/planets/OrbitRing.tsx` — `Line`/`LineLoop` at a given radius; color rgba(96,165,250,0.25); thin linewidth; show/hide via `store.showOrbits`.
- `components/planets/Planet.tsx` — Reusable component: `name, radius, distance, speed, color, hasRings, description, tilt`. Inside: `useFrame` advancing `θ` around Y axis; position `x=cos(θ)*distance, z=sin(θ)*distance`. Child: `<mesh><sphereGeometry/><meshStandardMaterial color roughness/metalness tuned per planet/>`. Self-rotation via mesh.rotation.y. Uses drei `<Html center distanceFactor>` or `<Text>` for label when `store.showLabels`.
- `components/planets/SaturnRing.tsx` — `RingGeometry` with inner/outer radius ≈ 1.4–2.2 × planet radius; transparent alpha gradient; tilted with Saturn.
- `components/planets/EarthAtmosphere.tsx` — Second sphere R×1.04, BackSide + transparent shader/fresnel-ish navy blue for rim-light effect. Optional cloud sphere at R×1.02 with semi-transparent white and independent rotation.
- `components/planets/AllPlanets.tsx` — Maps over PLANETS from data, renders `<Planet>` instances, plus Earth gets `<EarthAtmosphere>`, Saturn gets `<SaturnRing>`. OrbitRing per planet.
- Wire Earth click → `store.setSelectedPlanet('earth')` via `RaycastedPlanet` wrapper / `onClick` handler.

**Maps AC:** F1 (8 planets, orbits, motion, Earth atmosphere, Saturn rings), F2 (Earth click detection), F4 toggle hooks

**Test Requirements:**
- `rule`: All 8 planets visible, no overlaps at start. Animation loop runs (motion visible on 1–2 second observation).
- `rule`: OrbitRings only show when store.showOrbits=true. Labels only when showLabels=true.
- `rubric`: Planet differentiation (0–3, pass ≥1.5): 3=each planet visually distinct (color/size/tilt), Saturn ring layered, Earth night/glow visible; 2=8 planets distinguishable; 1=present but generic.

---

## Task 4: Camera controller (auto-rotate, Earth fly-to, zoom detection hook)

**Status:** pending

**Priority:** high

**Depends on:** Task 3

**Scope:**
- `hooks/useAutoRotate.ts` — Hook drives `OrbitControls.autoRotate=true` initially. Listens `pointerdown`/`wheel` on canvas → set `idle=false` → disable autoRotate. SetTimeout 4s after last `pointermove` → re-enable.
- `hooks/useCameraDistance.ts` — Returns `{ distanceToEarth, zoomLevel: 'system'|'planetary'|'regional'|'close' }` by measuring camera→Earth position per frame.
- `components/effects/CameraFlyTo.ts` — Listens `store.selectedPlanet`. If 'earth', lerp camera position to ~[0,12,28] targeting Earth; otherwise lerp to system view [45,35,70]. Uses `useFrame` + lerp factor ≈0.06–0.1; smooth damping.
- Wire `store.conjunctionMode` → fly camera to frame BOTH satellites of `store.selectedConjunction`.

**Maps AC:** F2 (auto-rotate, fly-to), F4 (zoom-level detection hook)

**Test Requirements:**
- `rule`: Auto-rotate pauses on first click/scroll, resumes ~4s idle.
- `rule`: Clicking Earth → camera smoothly (≥0.5s) transitions to close view; click background/reset → returns to system view.
- `rubric`: Flight smoothness (0–2, pass ≥1): 2=cinematic easing, no jitter, target framed perfectly; 1=smooth enough, reaches target.

---

## Task 5: HUD overlay (TopNav, EarthInfo, Stats, ZoomControls, BottomToolbar)

**Status:** pending

**Priority:** high

**Depends on:** Task 1

**Scope:**
- `components/ui/TopNav.tsx` — Fixed top bar: left logo `◉ ORBITGUARD / TRACK · PREDICT · PROTECT`, center nav tabs (`Live View`, `Debris Tracking`, `Risk Analysis`, `Missions`, `About`) with underline on `Live View`, right search input + real-time date/time clock (IST, updates each second).
- `components/ui/EarthInfoCard.tsx` — Top-left card shown when `store.selectedPlanet==='earth'` OR always as per screenshot 1 (always visible). 🌍 Earth header, rows: Distance from Sun, Orbital Period, Radius, Moons, Known Debris (LEO) 8,420, CTA `View Debris Around Earth →`. Close button X, re-fly on CTA.
- `components/ui/StatsPanel.tsx` — Top-right. Three stat chips: `Tracked Objects 34,218` (white), `Active Alerts 12` (red), `Collision Risks 3` (orange). Use `.glass`.
- `components/ui/ZoomControls.tsx` — Right vertical stack: compass `N` indicator, big circle + button, − button, reset-camera `◎` button. Each button calls zustand actions or drives OrbitControls zoom via ref.
- `components/ui/BottomToolbar.tsx` — Bottom-left rounded glass container, 4 toggle buttons: `◉ Orbits` (toggles `showOrbits`), `✣ Debris` (`showDebris`), `◌ Labels` (`showLabels`), `✧ Trails` (`showTrails`). Active state fills blue.
- In `App.tsx`, compose ThreeCanvas as sibling before HUD wrapper (`absolute inset-0 pointer-events-none`), each HUD child opt-in `pointer-events-auto`.

**Maps AC:** F3, NF1

**Test Requirements:**
- `rule`: HTML layout structure exactly matches spec tree (Canvas + HUD sibling).
- `rule`: Toggles in BottomToolbar flip zustand flags correctly (verified via store snapshot).
- `rule`: ZoomControls +, −, reset all function.
- `rubric`: HUD polish (0–3, pass ≥2): 3=no layout drift, panel corners align, typography two-font rhythm (UI sans + telemetry mono), glass shading consistent; 2=panels readable and in correct positions; 1=functional but misaligned.

---

## Task 6: Earth-orbit object layers (SatelliteField/DebrisField + LOD reveal + risk colors)

**Status:** pending

**Priority:** high

**Depends on:** Task 1, Task 4

**Scope:**
- `components/objects/SatelliteField.tsx` — Multi-LOD:
  - L2 (10–30u): InstancedMesh for ~500 constellation/debris (simplified `BoxGeometry` 0.06u or `Tetrahedron`), per-instance color mapped from risk, each with orbit-line path via thin line segments (only for selected + 5 nearest neighbors).
  - L3 (<10u): `Points` for 34,218 debris with risk-based vertex colors; geometry is a large `BufferAttribute`; seeded from `services/scenarios.ts`.
- `components/objects/MajorSatellites.tsx` — L1 (30–40u): ~20 individually named assets (ISS as small model/stack, HST, Starlink-x, Fengyun, Cosmos, DEB-48291 critical debris with red pulse). ISS and Hubble get `<Html>` labels always. Raycast `onClick` sets `store.setSelectedSatellite(id)`.
- `hooks/useZoomLevel.ts` — Gate visibility of each LOD layer based on camera→Earth distance. Unmount layers outside distance band for perf.
- Risk pulse: CRITICAL items animate `scale` 1×→1.3× sine + opacity via `useFrame`.
- Only when `showDebris=true` render the L3 points; otherwise hide. `showTrails=true` draw short trailing lines for ~50 closest + selected.

**Maps AC:** F4, NF4

**Test Requirements:**
- `rule`: Zoom levels show correct density bands (none >40, ~20 at 30-40, hundreds at 10-30, dense field <10).
- `rule`: CRITICAL marker pulses. Risk colors: green/yellow/orange/red match spec.
- `rubric`: Performance + visual density (0–3, pass ≥1.5): 3=smooth frame rate even at closest view with debris field; 2=occasional hitches but usable; 1=at least one LOD working at >15fps.

---

## Task 7: Intelligence Panel (right slide-in + telemetry + conjunctions + maneuver card)

**Status:** pending

**Priority:** high

**Depends on:** Task 1, Task 6

**Scope:**
- `components/panels/IntelligencePanel.tsx` — Mounted when `store.selectedSatellite !== null`. Framer Motion `x: 100% → x: 0` slide from right, fixed width 400–440px, top 0 right 0, height full minus top-nav margin. Close `×` top-right → `store.setSelectedSatellite(null)`.
- Header: Satellite icon, NORAD ID `DEB-48291`, `🔴 CRITICAL` badge, operator row (Russia flag + "Unknown / Debris").
- LIVE TELEMETRY: 6 chips (3x2 grid) — Altitude, Velocity, Inclination, Orbital Period, Last TLE Update, Orbit Type. Each chip shows number in JetBrains Mono-style telemetry font + a micro sparkline of last ~20 steps of seeded fluctuation.
- UPCOMING CONJUNCTIONS (next 72h): Table 5 rows (ISS, Fengyun, Starlink, Cosmos, self). Columns: #, Other Object, TCA (UTC), Miss Distance, Risk, Confidence. Row 1 = highlighted; click sets `store.setSelectedConjunction(row)` + optional jump to alert mode. CTA `View All Conjunctions →`.
- RECOMMENDED MANEUVER (AI badge): Δv magnitude 2.4 m/s, Direction Retrograde, Execution Time, New Predicted Miss Distance 1.8 km with "+86% improvement" pill. Big `▶ Run Simulation` button sets `store.setManeuverRunning(true)` and/or opens F7 overlay.
- AI EXPLANATION: Red warning card with why, Top-3 contributing factors as horizontal bars (Low miss distance 45%, High relative velocity 32%, Orbital plane intersection 23%). `Show full analysis →` link.
- Demo scenario data wired from `services/scenarios.ts` for DEB-48291 and fallback generic for other satellites.

**Maps AC:** F5, NF1

**Test Requirements:**
- `rule`: Panel slides in when satellite clicked, slides out on close.
- `rule`: All 6 telemetry chips + conjunctions table + maneuver card + AI explanation rendered for seeded DEB-48291.
- `rubric`: Panel information density & clarity (0–3, pass ≥2): 3=layout matches screenshot-2 nearly 1:1, chip sparklines animate, conjunctions rows have proper risk coloring, AI factor bars correctly width-mapped; 2=all sections present and readable.

---

## Task 8: Conjunction Alert Mode (banner + overlay + dual-object framing)

**Status:** pending

**Priority:** medium

**Depends on:** Task 4, Task 7

**Scope:**
- Zustand action `triggerAlert(conjunction)` → sets `conjunctionMode=true, selectedConjunction=conjunction`.
- `components/panels/ConjunctionAlertBanner.tsx` — Fixed top (below TopNav): red glass banner. Left icon ⚠ CONJUNCTION ALERT. Center: `HIGH RISK COLLISION DETECTED` label + large `T−HH:MM:SS` ticking countdown (based on seeded TCA date - `Date.now()`, fall back 42:17 static if past). Right: dismiss X.
- Scene overlay: darkened scene via `EffectComposer` vignette + subtle red scanline curtain `<mesh>` with additive transparent; camera flown to symmetric dual-object framing position (task 4 camera controller).
- Conjunction geometry in-scene: render both satellites' dashed orbit paths up to TCA, collision cross ✕ at predicted intercept, miss-distance ruler label next to the intercept.
- Side metrics panel floating near collision point: Current Distance (12.4 km), Predicted Miss Distance (320 m), Current Risk (HIGH).

**Maps AC:** F6

**Test Requirements:**
- `rule`: `triggerAlert()` causes banner to appear + countdown to tick.
- `rule`: Camera flies to dual-object symmetric frame.
- `rubric`: Alert drama vs readability (0–2, pass ≥1): 2=banner unmissable but not covering UI, countdown readable, scene tint effective; 1=present and visible.

---

## Task 9: Maneuver Simulation (trajectory diff + burn animation + miss-distance counter + risk ladder)

**Status:** pending

**Priority:** high

**Depends on:** Task 7, Task 8

**Scope:**
- `components/panels/ManeuverOverlay.tsx` — Appears when `store.maneuverRunning === true`. Plays fixed 4.5 s timeline via Framer Motion / `useState` + `setTimeout` ladder.
- Timeline phases:
  0.0–0.6s: Show original dashed trajectories + collision ✕; announce "Original trajectory"
  0.6–1.2s: Burn point appears on dodging-satellite path, retrograde Δv vector icon
  1.2–3.0s: Post-burn trajectory animates from burn point forward; two paths diverge
  2.2–4.0s: Animated counter 320 m → 840 m → 1.6 km → 2.4 km → 3.2 km / final value
  3.0–4.5s: Risk ladder CRITICAL → HIGH → MEDIUM → SAFE; success banner +86% improvement, Δv=2.4 m/s retrograde
- Scene layer update: draw post-burn orbit as separate new Line (cyan/dashed) from burn onward.
- Panel "Run Simulation" click in Task 7 also stores before/after values needed for overlay.
- Replay button at the end to re-run sequence.

**Maps AC:** F7

**Test Requirements:**
- `rule`: Pressing Run Simulation starts a non-interrupting sequence of ≥4s.
- `rule`: Miss-distance counter animates from low to high; risk badge changes ≥2 times to show reduction.
- `rubric`: Payoff polish (0–4, pass ≥2.5): 4=choreographed camera eye-line moves with burn, two trajectories visually diverge clearly; 3=all phases run, before/after readable; 2=static before/after with at least animated counter.

---

## Task 10: Integration cleanup + typecheck + build + diagnostics

**Status:** pending

**Priority:** high

**Depends on:** Tasks 1–9

**Scope:**
- Wire up all panels, toggles, camera flights end-to-end in `App.tsx`.
- Ensure unused imports removed (Parcel→Vite convention already done in earlier pass).
- `npx tsc --noEmit` → 0 errors.
- `npm run build` → produces dist successfully.
- `GetDiagnostics` on App, major panels, scene components → 0 errors.
- Final demo walkthrough check list:
  1. Boot → Solar System scene with auto-rotate & bloom
  2. Click Earth → camera flies, EarthInfo focused, HUD matches screenshot-1 positions
  3. Zoom into Earth → major satellites → hundreds → debris appear (Task 6 LOD)
  4. Click DEB-48291 → Intelligence Panel slides in (screenshot-2)
  5. Click ISS row (conj #1) → Conjunction Alert banner, dual framing
  6. Click Run Simulation → maneuver sequence plays, 320m→3.2km, CRITICAL→SAFE

**Maps AC:** NF2, NF3, F1–F7 end-to-end

**Test Requirements:**
- `rule`: `tsc --noEmit` exits 0.
- `rule`: `npm run build` exits 0 (chunk warnings allowed).
- `rule`: VSCode diagnostics for all 10 touched components → 0 errors.
- `rubric`: End-to-end demo flow (0–4, pass ≥3): 4=walkthrough 1–6 all flawless; 3=one minor hiccup (e.g. no auto revert) but story still told; 2=≥4 of 6 steps work.
