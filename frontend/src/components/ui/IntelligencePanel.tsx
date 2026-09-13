/**
 * ORBITGUARD – IntelligencePanel
 * Right-side object intelligence: telemetry, conjunctions, maneuver, AI explanation
 * Wired to the NEXORA backend API
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useOrbitGuard, Conjunction } from '../../store/orbitGuard';

/* ── demo data so the panel is always populated ── */
const DEMO_SAT = {
  id: 'DEB-48291',
  noradId: '48291',
  name: 'DEB-48291',
  operator: 'Unknown / Debris',
  altitudeKm: 742.3,
  velocityKmS: 7.62,
  inclinationDeg: 98.7,
  orbitalPeriodMin: 98.6,
  risk: 'CRITICAL' as const,
  isDebris: true,
};

const DEMO_CONJUNCTIONS: Conjunction[] = [
  {
    id: 'c1', primaryId: 'DEB-48291', secondaryId: 'ISS (ZARYA)',
    tcaIso: new Date(Date.now() + 2514000).toISOString(),
    missDistanceKm: 0.184, relativeVelocityKmS: 14.8,
    risk: 'HIGH', confidence: 92,
    summary: 'Critical crossing angle with ISS',
  },
  {
    id: 'c2', primaryId: 'DEB-48291', secondaryId: 'FENGYUN-1C DEB',
    tcaIso: new Date(Date.now() + 21600000).toISOString(),
    missDistanceKm: 2.4, relativeVelocityKmS: 9.2,
    risk: 'MEDIUM', confidence: 76,
    summary: 'Approaching debris cluster',
  },
  {
    id: 'c3', primaryId: 'DEB-48291', secondaryId: 'STARLINK-6781',
    tcaIso: new Date(Date.now() + 43200000).toISOString(),
    missDistanceKm: 4.8, relativeVelocityKmS: 7.6,
    risk: 'LOW', confidence: 54,
    summary: 'Low-priority watch',
  },
];

const DEMO_MANEUVER = {
  deltaVMs: 2.4,
  direction: 'Retrograde',
  executionIso: new Date(Date.now() + 1800000).toISOString(),
  newMissKm: 1.8,
  improvementPct: 86,
  factors: [
    { label: 'Low miss distance', pct: 45 },
    { label: 'High relative velocity', pct: 32 },
    { label: 'Orbital intersection', pct: 23 },
  ],
  whyText:
    'The objects are in near-opposite orbits with a converging trajectory in 1.2 hours. The current TLE accuracy and uncertainty window increases the risk of collision.',
};

const RISK_COLOR: Record<string, string> = {
  CRITICAL: '#ef4444',
  HIGH:     '#f97316',
  MEDIUM:   '#eab308',
  LOW:      '#22c55e',
  SAFE:     '#22c55e',
};

function Pill({ text, color }: { text: string; color: string }) {
  return (
    <span
      className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider"
      style={{
        color,
        backgroundColor: color + '22',
        border: `1px solid ${color}55`,
      }}
    >
      {text}
    </span>
  );
}

function TelemetryCard({ label, value, sub, icon }: {
  label: string; value: string; sub?: string; icon?: string;
}) {
  return (
    <div className="glass-sm rounded-xl p-3 flex flex-col gap-1">
      <div className="flex items-center gap-1.5 text-[10px] text-white/50">
        {icon && <span>{icon}</span>}
        {label}
      </div>
      <div className="text-base font-black font-mono tabular-nums text-white">
        {value}
      </div>
      {sub && <div className="text-[9px] text-white/30">{sub}</div>}
    </div>
  );
}

function formatTca(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function IntelligencePanel() {
  const { triggerAlert } = useOrbitGuard();
  const [simRunning, setSimRunning] = useState(false);
  const [simProgress, setSimProgress] = useState(0);
  const [currentMiss, setCurrentMiss] = useState(DEMO_MANEUVER.newMissKm);
  const [showFullAnalysis, setShowFullAnalysis] = useState(false);

  // The panel is always visible in this version
  const sat  = DEMO_SAT;
  const maneuver = DEMO_MANEUVER;

  function runSimulation() {
    setSimRunning(true);
    setSimProgress(0);
    setCurrentMiss(0.184);
    let frame = 0;
    const total = 60;
    const id = setInterval(() => {
      frame++;
      const p = frame / total;
      setSimProgress(p);
      setCurrentMiss(+(0.184 + (maneuver.newMissKm - 0.184) * Math.min(p * 1.4, 1)).toFixed(3));
      if (frame >= total) {
        clearInterval(id);
        setSimRunning(false);
        setSimProgress(1);
      }
    }, 50);
  }

  const riskAfterSim = simProgress >= 1 ? 'SAFE' : simProgress > 0.5 ? 'MEDIUM' : 'CRITICAL';

  return (
    <motion.aside
      className="pointer-events-auto fixed right-0 top-14 bottom-16 w-[420px]
        overflow-y-auto overflow-x-hidden
        border-l border-white/5"
      style={{ background: 'rgba(2,6,15,0.88)', backdropFilter: 'blur(20px)' }}
      initial={{ x: 60, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ delay: 0.4, type: 'spring', stiffness: 200, damping: 28 }}
    >
      {/* ── header ── */}
      <div className="sticky top-0 z-10 px-5 py-4 border-b border-white/5"
        style={{ background: 'rgba(2,6,15,0.95)', backdropFilter: 'blur(20px)' }}>
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-600 to-slate-800
              flex items-center justify-center text-lg border border-white/10">
              {sat.isDebris ? '⚠' : '🛰'}
            </div>
            <div>
              <div className="font-bold text-white text-base leading-tight">
                {sat.name}
              </div>
              <div className="text-[11px] text-white/40 mt-0.5">
                NORAD {sat.noradId}
                {sat.isDebris && <span className="ml-2 text-amber-400/80">· Debris</span>}
              </div>
              {sat.operator && (
                <div className="text-[10px] text-white/30 mt-0.5">
                  🏳 {sat.operator}
                </div>
              )}
            </div>
          </div>
          <div className="flex flex-col items-end gap-1.5">
            <Pill text={sat.risk} color={RISK_COLOR[sat.risk]} />
            {sat.isDebris && (
              <span className="text-[9px] text-amber-400/60 flex items-center gap-1">
                ⚠ Cannot maneuver
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="px-5 pb-6 space-y-5 pt-4">

        {/* ── Live Telemetry ── */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            <span className="text-[11px] font-bold text-white/70 uppercase tracking-widest">
              Live Telemetry
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <TelemetryCard icon="◎" label="Altitude"     value={`${sat.altitudeKm} km`}  sub="+2.4 km (24h)" />
            <TelemetryCard icon="→" label="Velocity"     value={`${sat.velocityKmS} km/s`} sub="+0.01 (24h)" />
            <TelemetryCard icon="↗" label="Inclination"  value={`${sat.inclinationDeg}°`} sub="+0.2° (24h)" />
          </div>
          <div className="grid grid-cols-2 gap-2 mt-2">
            <TelemetryCard icon="↺" label="Orbital Period" value={`${sat.orbitalPeriodMin} min`} sub="+0.3 min (24h)" />
            <TelemetryCard icon="🕐" label="Last TLE Update" value="2h 17m ago" sub="Source: Space-Track.org" />
          </div>
          <div className="mt-2 flex items-center justify-end gap-2">
            <div className="px-2 py-0.5 rounded bg-blue-500/15 border border-blue-400/30
              text-[10px] text-blue-300 font-mono">LEO</div>
            <span className="text-[10px] text-white/30">Orbit Type</span>
          </div>
        </section>

        {/* ── Upcoming Conjunctions ── */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-red-400 text-sm">⚠</span>
              <span className="text-[11px] font-bold text-white/70 uppercase tracking-widest">
                Upcoming Conjunctions
              </span>
            </div>
            <span className="text-[10px] text-white/30">Next 72 hours</span>
          </div>

          <div className="space-y-2">
            {/* header row */}
            <div className="grid grid-cols-[1.2fr_1fr_0.9fr_0.7fr_28px] text-[9px] text-white/30
              uppercase tracking-widest px-3 pb-1 border-b border-white/5">
              <span>#  Other Object</span>
              <span>TCA (UTC)</span>
              <span>Miss Dist</span>
              <span>Risk</span>
              <span />
            </div>

            {DEMO_CONJUNCTIONS.map((c, i) => (
              <motion.div
                key={c.id}
                className="grid grid-cols-[1.2fr_1fr_0.9fr_0.7fr_28px] items-center
                  px-3 py-2 rounded-lg glass-sm hover:bg-white/5 cursor-pointer group"
                whileHover={{ x: 2 }}
                onClick={() => triggerAlert(c)}
              >
                <div className="flex items-center gap-2 text-xs text-white/80">
                  <span className="text-white/30">{i + 1}</span>
                  <span className="truncate">{c.secondaryId}</span>
                </div>
                <span className="text-[11px] font-mono text-white/60">{formatTca(c.tcaIso)}</span>
                <span className="text-[11px] font-mono text-white/80 font-semibold">
                  {c.missDistanceKm < 1
                    ? `${(c.missDistanceKm * 1000).toFixed(0)} m`
                    : `${c.missDistanceKm.toFixed(1)} km`}
                </span>
                <Pill text={c.risk} color={RISK_COLOR[c.risk]} />
                <span className="text-white/20 group-hover:text-white/60 text-xs text-right">›</span>
              </motion.div>
            ))}

            <button className="text-[11px] text-sky-400/70 hover:text-sky-300 transition-colors
              flex items-center gap-1 pl-3 mt-1">
              View All Conjunctions →
            </button>
          </div>
        </section>

        {/* ── Recommended Maneuver ── */}
        <section className="border border-amber-500/25 rounded-xl p-4 bg-amber-900/10">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-amber-400 text-sm">⚡</span>
              <span className="text-[11px] font-bold text-white/80 uppercase tracking-widest">
                Recommended Maneuver
              </span>
              <span className="px-1.5 py-0.5 rounded text-[9px] bg-blue-500/20 text-blue-300 border border-blue-400/30">
                AI
              </span>
            </div>
            <Pill text="HIGH RISK" color={RISK_COLOR.HIGH} />
          </div>

          <div className="grid grid-cols-3 gap-3 mb-3">
            <div>
              <div className="text-[10px] text-white/40 mb-0.5 flex items-center gap-1">
                🔥 Δv Magnitude
              </div>
              <div className="text-lg font-black text-white">{maneuver.deltaVMs} m/s</div>
            </div>
            <div>
              <div className="text-[10px] text-white/40 mb-0.5 flex items-center gap-1">
                ↗ Direction
              </div>
              <div className="text-lg font-black text-white">{maneuver.direction}</div>
            </div>
            <div>
              <div className="text-[10px] text-white/40 mb-0.5 flex items-center gap-1">
                🕐 Execution
              </div>
              <div className="text-sm font-bold text-white font-mono">
                {formatTca(maneuver.executionIso)}
              </div>
            </div>
          </div>

          {/* before → after */}
          <div className="glass-sm rounded-lg p-3 mb-3 flex items-center justify-between">
            <div className="text-center">
              <div className="text-[10px] text-white/40">Current Miss</div>
              <div className="text-xl font-black text-red-400 font-mono">184 m</div>
            </div>
            <div className="text-white/30 text-2xl">→</div>
            <div className="text-center">
              <div className="text-[10px] text-white/40">New Miss Distance</div>
              <motion.div
                className="text-xl font-black text-green-400 font-mono"
                animate={{ scale: simRunning ? [1, 1.05, 1] : 1 }}
                transition={{ duration: 0.4, repeat: simRunning ? Infinity : 0 }}
              >
                {simProgress > 0 ? `${currentMiss.toFixed(1)} km` : `${maneuver.newMissKm} km`}
              </motion.div>
              {simProgress > 0 && (
                <div className="text-[10px] text-green-400/70 mt-0.5">
                  ↑ {maneuver.improvementPct}% improvement
                </div>
              )}
            </div>
          </div>

          {/* simulation button */}
          <motion.button
            onClick={runSimulation}
            disabled={simRunning}
            className="w-full py-3 rounded-xl font-bold text-sm tracking-wider uppercase
              bg-gradient-to-r from-blue-600 to-purple-600
              hover:from-blue-500 hover:to-purple-500
              disabled:opacity-60 disabled:cursor-not-allowed
              flex items-center justify-center gap-2 shadow-lg shadow-blue-900/40"
            whileHover={{ scale: simRunning ? 1 : 1.02 }}
            whileTap={{ scale: 0.97 }}
          >
            {simRunning ? (
              <>
                <motion.span
                  className="w-4 h-4 border-2 border-white border-t-transparent rounded-full"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                />
                Simulating…
              </>
            ) : (
              <>▶ Run Simulation</>
            )}
          </motion.button>

          {/* progress bar */}
          <AnimatePresence>
            {simProgress > 0 && (
              <motion.div
                className="mt-3 space-y-1"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
              >
                <div className="flex justify-between text-[10px] text-white/40">
                  <span>Risk level</span>
                  <Pill text={riskAfterSim} color={RISK_COLOR[riskAfterSim]} />
                </div>
                <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                  <motion.div
                    className="h-full rounded-full bg-gradient-to-r from-red-500 to-green-500"
                    initial={{ width: '0%' }}
                    animate={{ width: `${simProgress * 100}%` }}
                    transition={{ duration: 0.1 }}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        {/* ── AI Explanation ── */}
        <section>
          <button
            onClick={() => setShowFullAnalysis(v => !v)}
            className="w-full flex items-center justify-between text-[11px] text-white/50
              hover:text-white/80 transition-colors pb-3 border-b border-white/5"
          >
            <span className="flex items-center gap-2 font-bold uppercase tracking-widest">
              ⚠ AI Explanation
            </span>
            <span>{showFullAnalysis ? '▲' : '▼'}</span>
          </button>

          <AnimatePresence>
            {showFullAnalysis && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="pt-3 space-y-4 overflow-hidden"
              >
                {/* risk bars */}
                <div className="glass-sm rounded-xl p-3 space-y-2.5">
                  <div className="text-[10px] text-white/50 uppercase tracking-wider mb-1">
                    Top 3 Contributing Factors
                  </div>
                  {maneuver.factors.map((f, i) => (
                    <div key={i}>
                      <div className="flex justify-between text-[11px] mb-1">
                        <span className="text-white/70">{i + 1}. {f.label}</span>
                        <span className="text-white font-bold">{f.pct}%</span>
                      </div>
                      <div className="h-1 rounded-full bg-white/5 overflow-hidden">
                        <motion.div
                          className="h-full rounded-full"
                          style={{ backgroundColor: ['#ef4444','#f97316','#eab308'][i] }}
                          initial={{ width: 0 }}
                          animate={{ width: `${f.pct}%` }}
                          transition={{ delay: i * 0.1, duration: 0.7 }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* why text */}
                <div className="glass-sm rounded-xl p-3">
                  <div className="text-[10px] text-amber-400/70 uppercase tracking-wider mb-2">
                    Why is this Critical?
                  </div>
                  <p className="text-[11px] text-white/60 leading-relaxed">{maneuver.whyText}</p>
                  <button className="text-[11px] text-sky-400/70 hover:text-sky-300 mt-2 transition-colors">
                    Show full analysis →
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>

      </div>
    </motion.aside>
  );
}
