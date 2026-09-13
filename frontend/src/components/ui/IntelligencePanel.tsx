/**
 * ORBITGUARD – IntelligencePanel
 * Right-side object intelligence. Opens only when a satellite is
 * selected (progressive disclosure). Sections: header, live telemetry,
 * upcoming conjunctions (from the active scenario), recommended
 * maneuver with working simulation, AI explanation.
 */
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useOrbitGuard } from '../../store/orbitGuard';
import { getManeuverForSatellite } from '../../services/scenarios';
import { getConjunctionsFor } from '../../services/scenariosBridge';
import { SAT_NAME_BY_ID } from '../../data/satellites';

const RISK_COLOR: Record<string, string> = {
  CRITICAL: '#ef4444',
  HIGH:     '#f97316',
  MEDIUM:   '#eab308',
  LOW:      '#22c55e',
  SAFE:     '#22c55e',
  WATCH:    '#eab308',
};

function Pill({ text, color }: { text: string; color: string }) {
  return (
    <span
      className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider"
      style={{ color, backgroundColor: color + '22', border: `1px solid ${color}55` }}
    >
      {text}
    </span>
  );
}

function TelemetryCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="glass-sm rounded-xl p-3 flex flex-col gap-1">
      <div className="text-[10px] text-white/50">{label}</div>
      <div className="text-base font-black font-mono tabular-nums text-white">{value}</div>
      {sub && <div className="text-[9px] text-white/30">{sub}</div>}
    </div>
  );
}

function formatTca(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function IntelligencePanel() {
  const satInfo = useOrbitGuard((s) => s.satInfo);
  const selectedSatellite = useOrbitGuard((s) => s.selectedSatellite);
  const setSelectedSatellite = useOrbitGuard((s) => s.setSelectedSatellite);
  const triggerAlert = useOrbitGuard((s) => s.triggerAlert);
  const setSimProgress = useOrbitGuard((s) => s.setSimProgress);
  const updateSelectedConjunction = useOrbitGuard((s) => s.updateSelectedConjunction);

  const [simState, setSimState] = useState<'idle' | 'running' | 'done'>('idle');
  const [showAnalysis, setShowAnalysis] = useState(false);

  if (!satInfo || !selectedSatellite) return null;

  const sat = satInfo;
  const catalogId =
    sat.id === 'deb-48291' ? 'DEB-48291'
    : sat.id === 'iss' ? 'ISS-ZARYA'
    : sat.id === 'hubble' ? 'HUBBLE'
    : sat.id === 'starlink' ? 'STARLINK-3176'
    : sat.id;
  const conjunctions = getConjunctionsFor(sat.id);
  const worst = conjunctions[0] ?? null;
  const maneuver = getManeuverForSatellite(catalogId, worst as Parameters<typeof getManeuverForSatellite>[1]);

  const canManeuver = !sat.isDebris && sat.id !== 'iss';
  const originalMissKm = worst ? worst.missDistanceKm : 2.5;
  const currentMiss =
    simState === 'done' ? maneuver.newMissKm
    : simState === 'running' ? originalMissKm + (maneuver.newMissKm - originalMissKm) * 0.5
    : originalMissKm;

  const runSimulation = () => {
    if (simState === 'running') return;
    setSimState('running');
    setSimProgress(0.001);
    let p = 0;
    const id = setInterval(() => {
      p += 0.04;
      setSimProgress(Math.min(1, p));
      if (p >= 1) {
        clearInterval(id);
        setSimState('done');
        setSimProgress(1);
        // reflect the new miss distance on the active alert banner
        updateSelectedConjunction({ predictedMissKm: maneuver.newMissKm });
      }
    }, 60);
  };

  const riskAfterSim =
    simState === 'done' ? 'SAFE'
    : simState === 'running' ? 'MEDIUM'
    : worst?.risk ?? 'HIGH';

  const fmtMiss = (km: number) => (km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`);

  return (
    <motion.aside
      className="pointer-events-auto fixed right-0 top-14 bottom-16 w-[400px]
        overflow-y-auto overflow-x-hidden border-l border-white/5"
      style={{ background: 'rgba(2,6,15,0.88)', backdropFilter: 'blur(20px)' }}
      initial={{ x: 80, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 80, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 220, damping: 28 }}
    >
      {/* header */}
      <div className="sticky top-0 z-10 px-5 py-4 border-b border-white/5"
        style={{ background: 'rgba(2,6,15,0.95)', backdropFilter: 'blur(20px)' }}>
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-600 to-slate-800
              flex items-center justify-center text-lg border border-white/10">
              {sat.isDebris ? '⚠' : '🛰'}
            </div>
            <div>
              <div className="font-bold text-white text-base leading-tight">{sat.name}</div>
              <div className="text-[11px] text-white/40 mt-0.5">
                NORAD {sat.noradId}
                {sat.isDebris && <span className="ml-2 text-amber-400/80">· Debris</span>}
              </div>
              {sat.operator && (
                <div className="text-[10px] text-white/30 mt-0.5">⚑ {sat.operator}</div>
              )}
            </div>
          </div>
          <div className="flex flex-col items-end gap-1.5">
            <button
              onClick={() => setSelectedSatellite(null)}
              className="w-7 h-7 rounded-md flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 text-sm"
              aria-label="Close panel"
            >
              ✕
            </button>
            <Pill text={sat.risk} color={RISK_COLOR[sat.risk]} />
          </div>
        </div>
      </div>

      <div className="px-5 pb-6 space-y-5 pt-4">
        {/* live telemetry */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            <span className="text-[11px] font-bold text-white/70 uppercase tracking-widest">Live Telemetry</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <TelemetryCard label="Altitude"    value={`${sat.altitudeKm} km`}     sub="+2.4 km (24h)" />
            <TelemetryCard label="Velocity"    value={`${sat.velocityKmS} km/s`}  sub="+0.01 (24h)" />
            <TelemetryCard label="Inclination" value={`${sat.inclinationDeg}°`}   sub="+0.2° (24h)" />
          </div>
          <div className="grid grid-cols-2 gap-2 mt-2">
            <TelemetryCard label="Orbital Period" value={`${sat.orbitalPeriodMin} min`} sub="+0.3 min (24h)" />
            <TelemetryCard label="Last TLE Update" value="2h 17m ago" sub="Source: Space-Track.org" />
          </div>
        </section>

        {/* upcoming conjunctions */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold text-white/70 uppercase tracking-widest">
              ⚠ Upcoming Conjunctions
            </span>
            <span className="text-[10px] text-white/30">Next 72 hours</span>
          </div>
          <div className="space-y-2">
            {conjunctions.map((c, i) => (
              <motion.div
                key={c.id}
                className="flex items-center gap-2 px-3 py-2 rounded-lg glass-sm hover:bg-white/5 cursor-pointer group"
                whileHover={{ x: 2 }}
                onClick={() => triggerAlert(c)}
              >
                <span className="text-white/30 text-xs">{i + 1}</span>
                <span className="flex-1 truncate text-xs text-white/80">
                  {SAT_NAME_BY_ID[c.secondaryId] ?? c.secondaryId}
                </span>
                <span className="text-[11px] font-mono text-white/60">{formatTca(c.tcaIso)}</span>
                <span className="text-[11px] font-mono font-semibold text-white/80 w-14 text-right">
                  {fmtMiss(c.missDistanceKm)}
                </span>
                <Pill text={c.risk} color={RISK_COLOR[c.risk]} />
                <span className="text-white/20 group-hover:text-white/60 text-xs">›</span>
              </motion.div>
            ))}
          </div>
        </section>

        {/* recommended maneuver */}
        <section className={`border rounded-xl p-4 ${canManeuver ? 'border-amber-500/25 bg-amber-900/10' : 'border-white/10 bg-white/[0.02]'}`}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold text-white/80 uppercase tracking-widest">
              ⚡ Recommended Maneuver <span className="ml-1 px-1.5 py-0.5 rounded text-[9px] bg-blue-500/20 text-blue-300 border border-blue-400/30">AI</span>
            </span>
            <Pill text={worst?.risk ?? 'HIGH'} color={RISK_COLOR[worst?.risk ?? 'HIGH']} />
          </div>

          {!canManeuver ? (
            <p className="text-[11px] text-white/50 leading-relaxed">
              {sat.isDebris
                ? '⚠ This object is untracked debris — it cannot maneuver. Screening recommends the secondary object perform avoidance.'
                : '✔ No maneuver required — this object is operating normally within its protected zone.'}
            </p>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-3 mb-3">
                <div>
                  <div className="text-[10px] text-white/40 mb-0.5">🔥 Δv</div>
                  <div className="text-lg font-black text-white">{maneuver.deltaVMs} m/s</div>
                </div>
                <div>
                  <div className="text-[10px] text-white/40 mb-0.5">↗ Direction</div>
                  <div className="text-sm font-black text-white">{maneuver.direction}</div>
                </div>
                <div>
                  <div className="text-[10px] text-white/40 mb-0.5">🕐 Execution</div>
                  <div className="text-xs font-bold text-white font-mono">{formatTca(maneuver.executionIso)}</div>
                </div>
              </div>

              <div className="glass-sm rounded-lg p-3 mb-3 flex items-center justify-between">
                <div className="text-center">
                  <div className="text-[10px] text-white/40">Current Miss</div>
                  <div className="text-xl font-black text-red-400 font-mono">{fmtMiss(originalMissKm)}</div>
                </div>
                <div className="text-white/30 text-2xl">→</div>
                <div className="text-center">
                  <div className="text-[10px] text-white/40">New Miss Distance</div>
                  <motion.div
                    className="text-xl font-black text-green-400 font-mono"
                    animate={{ scale: simState === 'running' ? [1, 1.05, 1] : 1 }}
                    transition={{ duration: 0.4, repeat: simState === 'running' ? Infinity : 0 }}
                  >
                    {fmtMiss(currentMiss)}
                  </motion.div>
                  {simState === 'done' && (
                    <div className="text-[10px] text-green-400/70 mt-0.5">↑ {maneuver.improvementPct}% improvement</div>
                  )}
                </div>
              </div>

              <motion.button
                onClick={runSimulation}
                disabled={simState === 'running'}
                className="w-full py-3 rounded-xl font-bold text-sm tracking-wider uppercase
                  bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500
                  disabled:opacity-60 disabled:cursor-not-allowed
                  flex items-center justify-center gap-2 shadow-lg shadow-blue-900/40"
                whileHover={{ scale: simState === 'running' ? 1 : 1.02 }}
                whileTap={{ scale: 0.97 }}
              >
                {simState === 'running' ? (
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

              {simState !== 'idle' && (
                <div className="mt-3 space-y-1">
                  <div className="flex justify-between text-[10px] text-white/40">
                    <span>Risk level</span>
                    <Pill text={riskAfterSim} color={RISK_COLOR[riskAfterSim]} />
                  </div>
                  <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                    <motion.div
                      className="h-full rounded-full bg-gradient-to-r from-red-500 to-green-500"
                      animate={{ width: `${(simState === 'done' ? 1 : 0.5) * 100}%` }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>
                </div>
              )}
            </>
          )}
        </section>

        {/* AI explanation */}
        <section>
          <button
            onClick={() => setShowAnalysis(v => !v)}
            className="w-full flex items-center justify-between text-[11px] text-white/50
              hover:text-white/80 transition-colors pb-3 border-b border-white/5"
          >
            <span className="flex items-center gap-2 font-bold uppercase tracking-widest">⚠ AI Explanation</span>
            <span>{showAnalysis ? '▲' : '▼'}</span>
          </button>

          <AnimatePresence>
            {showAnalysis && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="pt-3 space-y-3 overflow-hidden"
              >
                <div className="glass-sm rounded-xl p-3 space-y-2.5">
                  <div className="text-[10px] text-white/50 uppercase tracking-wider">Top Contributing Factors</div>
                  {maneuver.factors.map((f, i) => (
                    <div key={i}>
                      <div className="flex justify-between text-[11px] mb-1">
                        <span className="text-white/70">{i + 1}. {f.label}</span>
                        <span className="text-white font-bold">{f.pct}%</span>
                      </div>
                      <div className="h-1 rounded-full bg-white/5 overflow-hidden">
                        <motion.div
                          className="h-full rounded-full"
                          style={{ backgroundColor: ['#ef4444', '#f97316', '#eab308'][i] }}
                          initial={{ width: 0 }}
                          animate={{ width: `${f.pct}%` }}
                          transition={{ delay: i * 0.1, duration: 0.7 }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="glass-sm rounded-xl p-3">
                  <div className="text-[10px] text-amber-400/70 uppercase tracking-wider mb-2">Why?</div>
                  <p className="text-[11px] text-white/60 leading-relaxed">{maneuver.whyText}</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>
      </div>
    </motion.aside>
  );
}
