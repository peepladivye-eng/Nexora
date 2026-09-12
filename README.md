# NEXORA — Orbital Collision Avoidance System

AI-powered orbital conjunction assessment and collision avoidance for satellite operators.

## Overview

NEXORA provides real-time collision risk assessment and automated maneuver planning for satellites in Low Earth Orbit (LEO). Built on validated orbital mechanics libraries, NEXORA screens thousands of satellite-debris conjunctions, calculates collision probabilities using industry-standard methods, and recommends optimal avoidance maneuvers.

## Key Features

- **Validated Collision Probability**: Uses `satguard` library with Foster/Chan methods validated against NASA CARA references
- **Real-time Conjunction Screening**: Monitors Starlink constellation against active debris fields (Cosmos-2251, Iridium-33, Fengyun-1C)
- **Intelligent Maneuver Planning**: Clohessy-Wiltshire optimal avoidance maneuvers with fuel-cost optimization
- **High-End 3D Visualization**: React-globe.gl + Framer Motion for cinematic orbital visualization
- **Uncertainty-Aware Risk Assessment**: Debris-tracking uncertainty calibration layer on top of base Pc calculations

## Technology Stack

### Backend
- **FastAPI** - High-performance Python API framework
- **satguard** - Validated conjunction assessment (SGP4, Foster/Chan Pc, CW maneuvers)
- **kessler-toolkit** - Cross-validation of collision probability calculations

### Frontend
- **React + TypeScript + Vite** - Modern frontend stack
- **react-globe.gl** - 3D Earth visualization with orbital paths
- **Framer Motion** - High-end UI animations and transitions
- **Tailwind CSS** - Glassmorphism design system
- **Recharts** - Fuel-tradeoff and risk visualization

## Architecture

```
Frontend (React + react-globe.gl + Framer Motion)
    ↓ REST API
Backend (FastAPI + satguard)
    ├─ TLE Loader (CelesTrak debris groups + Starlink)
    ├─ Propagator (SGP4 via satguard)
    ├─ Conjunction Screener (KDTree spatial search)
    ├─ Risk Calculator (Foster/Chan Pc + debris-uncertainty calibration)
    └─ Maneuver Planner (Clohessy-Wiltshire optimal burns)
```

## Why satguard?

We built the risk-triage UX, the calibration layer that accounts for debris tracking uncertainty, and the maneuver visualization ourselves. For the core collision probability calculation and Clohessy-Wiltshire maneuver math, we use `satguard`, an open-source library validated against published Vallado/NASA-CARA references. We didn't want to risk shipping subtly-wrong collision probability math under time pressure, and we cross-checked its output against a second independent implementation (`kessler-toolkit`) to ensure trustworthy numbers.

## Quick Start

### Backend Setup
```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload
```

### Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

## API Endpoints

- `GET /api/conjunctions` - List all flagged conjunction events, sorted by risk
- `GET /api/maneuver/{conjunction_id}` - Compute optimal avoidance maneuver
- `GET /api/maneuver/{conjunction_id}/sweep` - Get full delta-v/timing parameter sweep
- `GET /api/copilot/{conjunction_id}` - AI-generated risk brief (optional)

## Data Sources

- **CelesTrak** - Public TLE data for debris fields and satellite constellations
  - Cosmos-2251 debris (2009 Iridium-33 collision)
  - Iridium-33 debris
  - Fengyun-1C debris (2007 Chinese ASAT test)
  - Starlink constellation

## Security

All API keys and credentials live exclusively in `/backend/.env` and are never exposed to the frontend. The frontend only communicates with our FastAPI backend, never directly with external services. See `.env.example` for required configuration.

## Development

Built for the AI-2 hackathon with focus on:
1. **Validated physics** - No hand-rolled orbital math, use proven libraries
2. **Premium UX** - Framer Motion animations, shared-element transitions, cinematic boot sequence
3. **Real data** - Live TLE ingestion from CelesTrak, actual conjunction screening
4. **Explainability** - Every risk number shows both Foster and Chan Pc for transparency

## License

MIT

## References

- Vallado, D.A. "Fundamentals of Astrodynamics and Applications"
- NASA CARA conjunction assessment methodology
- satguard library: validated Foster/Chan/Alfano collision probability methods
- Real-world precedent: 2009 Iridium-33/Cosmos-2251 collision (first accidental hypervelocity collision between two intact satellites)
