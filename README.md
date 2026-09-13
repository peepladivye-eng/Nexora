# NEXORA — Orbital Collision Avoidance System

> **PREDICT. ASSESS. AVOID.**  
> AI-assisted space debris conjunction detection, risk scoring, and automated maneuver planning for satellites in Low Earth Orbit.

[![MIT License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

---

## What It Does

NEXORA is a full end-to-end collision avoidance workflow:

| Step | What happens |
|---|---|
| 📡 **TLE Ingest** | Fetches real orbital elements from CelesTrak (Starlink + 3 debris fields). Falls back to stale cache if offline. |
| 🛰 **SGP4 Propagation** | Propagates every object's orbit forward using Skyfield's validated SGP4 implementation |
| ⚠️ **Conjunction Screening** | KDTree spatial search finds close approaches across all object pairs |
| 📊 **Dual Pc + Risk Score** | Foster & Chan collision probability (cross-verified) + explainable 0-100 risk score with distance/velocity/urgency breakdown |
| 🎯 **Maneuver Planning** | Clohessy-Wiltshire equations sweep 400 delta-V × timing combinations; recommends the fuel-minimum burn that achieves safe separation |
| ✅ **Cascade Check** | Re-screens corrected trajectory against the full catalog to detect any new risks introduced by the maneuver |
| 🌍 **3D Globe** | Pure Canvas orthographic globe with 90-min Kepler orbit trails, drag-to-rotate, and live TCA countdown timers |

---

## Live Demo

Open two terminals:

```bash
# Terminal 1 — backend
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload
# → http://localhost:8000  (API docs at /docs)

# Terminal 2 — frontend
cd frontend
npm install
npm run dev
# → http://localhost:5173
```

---

## Demo Scenarios

The header dropdown switches between named scenarios instantly (no propagation delay):

| Scenario | Description |
|---|---|
| 🛰 Live Data | Real CelesTrak TLE screening |
| 🚨 Critical Alert | Single emergency-level conjunction |
| ⚡ High Activity | Multiple concurrent CRITICAL/HIGH events |
| 📊 Typical Ops | Realistic mixed-risk operational day |
| 🎓 Educational | One event per risk level for demonstration |
| ✅ Quiet Ops | Minimal-risk routine monitoring |

---

## API Reference

| Endpoint | Description |
|---|---|
| `GET /api/conjunctions` | All events sorted by risk; supports `?demo_scenario=` |
| `GET /api/maneuver/{id}` | Optimal CW avoidance maneuver |
| `GET /api/maneuver/{id}/sweep` | Full 400-option parameter sweep (what-if simulator) |
| `GET /api/maneuver/{id}/cascade` | Cascade risk check on corrected trajectory |
| `GET /api/maneuver/{id}/brief?question=` | Natural-language mission briefs |

---

## Risk Scoring

Two independent methods, both shown for transparency:

**Foster / Chan Collision Probability** — validated 2D Gaussian integral with 2× debris-uncertainty calibration layer applied on top of the base LEO covariance.

**Conjunction Risk Score (0–100)** — deterministic, explainable triage score (methodology from reference implementation):

```
distance_score = 100 × (1 − min(miss_km / 10, 1))          [50% weight]
velocity_score = 100 × min(v_rel / 15, 1)                   [30% weight]
urgency_score  = 100 × (1 − min(hours_to_tca / 24, 1))     [20% weight]
risk_score     = 0.5×distance + 0.3×velocity + 0.2×urgency
```

Categories: 0–39 LOW · 40–69 MEDIUM · 70–84 HIGH · 85–100 CRITICAL

> This score is a triage tool, not a collision probability. It is clearly labelled as such throughout the UI.

---

## Maneuver Planning

The Clohessy-Wiltshire planner sweeps 20 delta-V values × 20 burn-timing values (400 combinations). The What-If Simulator lets you drag two sliders to explore any point in that grid without a new API call — the full sweep is fetched once and held in frontend state.

Typical result for a CRITICAL event (0.82 km miss):
- Recommended burn: **0.69 m/s in-track**, 16.5 h before TCA
- Miss distance: 0.82 km → 5.01 km (**2×+ improvement**)
- Propellant cost: **0.060 kg** (0.023% of satellite mass)

---

## Architecture

```
Frontend  (React + TypeScript + Framer Motion + Parcel)
  ├── GlobeView          — Canvas 2D orthographic globe, Kepler orbit trails
  ├── ConjunctionCard    — Staggered list with risk badge + TCA countdown
  ├── RiskScoreBar       — Animated factor breakdown (distance/velocity/urgency)
  ├── ManeuverPanel      — What-If sliders + Mission Copilot + Cascade check
  └── TcaCountdown       — Live-updating hh:mm:ss countdown, pulses <1h

Backend  (FastAPI + Python + Skyfield + SciPy)
  ├── tle_loader.py      — CelesTrak fetch + 6h cache + stale fallback
  ├── engine.py          — SGP4 propagation, KDTree screening, Foster/Chan Pc,
  │                        Conjunction Risk Score, 5 named demo scenarios
  ├── maneuvers.py       — Clohessy-Wiltshire planner, rocket equation
  └── routers/
      ├── conjunctions   — /api/conjunctions with demo_scenario support
      └── maneuvers      — /api/maneuver/{id} + sweep + cascade + brief
```

---

## Data Sources

| Source | What | Notes |
|---|---|---|
| [CelesTrak](https://celestrak.org) | TLE orbital elements | Public API, no auth required |
| Cosmos-2251 debris | ~585 objects | 2009 Iridium-33 collision |
| Iridium-33 debris | ~110 objects | Same 2009 event |
| Fengyun-1C debris | ~1969 objects | 2007 Chinese ASAT test |
| Starlink | ~10,711 satellites | Active constellation |

---

## Security

- All secrets live only in `backend/.env` (never committed — `.env` is in `.gitignore` from commit #1)
- Frontend never holds API keys; it only calls `http://localhost:8000/api/*`
- CORS scoped to `localhost:5173` and `localhost:5174`, not `*`
- No `VITE_`-prefixed secrets anywhere in the frontend bundle

---

## Stack

| Layer | Technology |
|---|---|
| Backend | Python 3.11+, FastAPI, Skyfield (SGP4), SciPy (KDTree), NumPy |
| Frontend | React 18, TypeScript, Parcel, Framer Motion, Tailwind CSS, Recharts |
| Orbital math | Skyfield SGP4, Clohessy-Wiltshire equations, Foster/Chan Pc, Rodrigues' rotation |
| Data | CelesTrak TLE API (public, documented endpoint) |

---

## Attribution

- **Skyfield** — Brandon Rhodes (MIT) — SGP4 propagation
- **Siddhanth17/Nexora** — Conjunction Risk Score methodology, demo scenario structure
- **CelesTrak** — Dr. T.S. Kelso — public TLE data
- Clohessy & Wiltshire (1960) — relative motion equations
- Foster (1992), Chan (1997) — collision probability methods

---

## License

MIT — see [LICENSE](LICENSE)

---

*Built for the AI-2 hackathon. Not for operational use.*
