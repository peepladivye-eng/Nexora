/**
 * NEXORA – ManeuverPanel
 * Maneuver computation + What-If simulator + Mission Copilot
 * + Maneuver Safety Shield (AI rejects burns that induce new conjunctions)
 * + Multi-Operator Conflict Resolution (ISRO-based coordination solver)
 */

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, ReferenceLine
} from 'recharts';
import api, { ConjunctionEvent, ManeuverResponse } from '../services/api';
import StatCounter from './StatCounter';
import { solveConflict, ConflictResolutionResult, ConflictOption } from '../utils/conflictSolver';

interface ManeuverPanelProps {
  conjunctionId: string;
  originalPc: number;
  originalMiss: number;
  event: ConjunctionEvent;
  knownNames: Record<string, string>;
}

interface SweepOption {
  delta_v_ms: number;
  time_before_tca_hours: number;
  time_before_tca_s: number;
  post_miss_km: number;
  post_pc: number;
  propellant_cost_kg: number;
  original_miss_km: number;
  original_pc?: number;
  direction: string;
}

interface CascadeRisk {
  norad_id_secondary: string;
  miss_distance_km: number;
  pc_foster: number;
  risk_level: string;
}

const sp = { type: 'spring' as const, stiffness: 280, damping: 28 };

function snapToGrid(sweepData: SweepOption[], dvIdx: number, tIdx: number) {
  const dvValues  = [...new Set(sweepData.map(o => o.delta_v_ms))].sort((a, b) => a - b);
  const tValues   = [...new Set(sweepData.map(o => o.time_before_tca_hours))].sort((a, b) => a - b);
  const dv = dvValues[Math.min(dvIdx, dvValues.length - 1)];
  const t  = tValues[Math.min(tIdx,  tValues.length  - 1)];
  return sweepData.find(o => o.delta_v_ms === dv && Math.abs(o.time_before_tca_hours - t) < 0.01)
      ?? sweepData[0];
}

const NORAD_NAMES: Record<string, string> = {
  '22675': 'COSMOS 2251', '44714': 'STARLINK-1008',
  '44718': 'STARLINK-1012', '44723': 'STARLINK-1017',
  '25544': 'ISS (ZARYA)', '20580': 'HUBBLE',
};

function nameOf(id: string, known: Record<string, string>) {
  return known[id] ?? NORAD_NAMES[id] ?? `SAT-${id}`;
}

export const ManeuverPanel = ({ conjunctionId, originalPc, originalMiss, event, knownNames }: ManeuverPanelProps) => {
  const [loading, setLoading]       = useState(false);
  const [result, setResult]         = useState<ManeuverResponse | null>(null);
  const [error, setError]           = useState<string | null>(null);

  // sweep / what-if
  const [sweep, setSweep]           = useState<SweepOption[]>([]);
  const [sweepLoading, setSweepLoading] = useState(false);
  const [showWhatIf, setShowWhatIf] = useState(false);
  const [dvIdx, setDvIdx]           = useState(0);
  const [tIdx, setTIdx]             = useState(0);

  const [shieldOverride, setShieldOverride] = useState(false);
  const [shieldSearching, setShieldSearching] = useState(false);

  // brief / copilot
  const [brief, setBrief]           = useState<string | null>(null);
  const [briefQ, setBriefQ]         = useState<string | null>(null);
  const [briefLoading, setBriefLoading] = useState(false);

  // cascading check (Safety Shield)
  const [cascade, setCascade]       = useState<CascadeRisk[]>([]);
  const [cascadeLoading, setCascadeLoading] = useState(false);
  const [cascadeChecked, setCascadeChecked] = useState(false);

  // Conflict Resolution
  const [conflict, setConflict]     = useState<ConflictResolutionResult | null>(null);
  const [showConflict, setShowConflict] = useState(false);

  const compute = async (forceDv?: number, forceHours?: number) => {
    setLoading(true);
    setError(null);
    setResult(null);
    setSweep([]);
    setShowWhatIf(false);
    setCascadeChecked(false);
    setCascade([]);
    setShieldOverride(false);
    try {
      const data = await api.getManeuver(conjunctionId);
      if (forceDv !== undefined) {
        data.maneuver.delta_v_ms = forceDv;
        data.maneuver.time_before_tca_hours = forceHours ?? data.maneuver.time_before_tca_hours;
        data.maneuver.burn_description = `${(forceDv).toFixed(3)} m/s ${data.maneuver.direction} burn`;
      }
      setResult(data);
      loadSweep();
    } catch (e: any) {
      setError(e?.response?.data?.detail ?? 'Maneuver computation failed');
    } finally {
      setLoading(false);
    }
  };

  const loadSweep = async () => {
    setSweepLoading(true);
    try {
      const data = await api.getManeuverSweep(conjunctionId);
      const opts: SweepOption[] = data.options ?? [];
      setSweep(opts);
      const rec = data.recommended;
      if (rec && opts.length) {
        const dvVals = [...new Set(opts.map((o: SweepOption) => o.delta_v_ms))].sort((a, b) => a - b);
        const tVals  = [...new Set(opts.map((o: SweepOption) => o.time_before_tca_hours))].sort((a, b) => a - b);
        setDvIdx(dvVals.findIndex((v: number) => Math.abs(v - rec.delta_v_ms) < 0.001) || 0);
        setTIdx(tVals.findIndex((v: number) => Math.abs(v - rec.time_before_tca_hours) < 0.01) || 0);
      }
    } catch { /* ignore */ }
    finally { setSweepLoading(false); }
  };

  const selected = useMemo(
    () => sweep.length ? snapToGrid(sweep, dvIdx, tIdx) : null,
    [sweep, dvIdx, tIdx]
  );

  const dvValues = useMemo(
    () => [...new Set(sweep.map(o => o.delta_v_ms))].sort((a, b) => a - b),
    [sweep]
  );
  const tValues = useMemo(
    () => [...new Set(sweep.map(o => o.time_before_tca_hours))].sort((a, b) => a - b),
    [sweep]
  );

  const dvChartData = useMemo(() => {
    if (!sweep.length || !tValues.length) return [];
    const tFixed = tValues[tIdx] ?? tValues[0];
    return sweep
      .filter(o => Math.abs(o.time_before_tca_hours - tFixed) < 0.01)
      .sort((a, b) => a.delta_v_ms - b.delta_v_ms)
      .map(o => ({ dv: +o.delta_v_ms.toFixed(3), miss: +o.post_miss_km.toFixed(2) }));
  }, [sweep, tValues, tIdx]);

  const loadBrief = async (q: string) => {
    setBriefQ(q); setBrief(null); setBriefLoading(true);
    try {
      const data = await api.getManeuverBrief(conjunctionId, q);
      setBrief(data.brief);
    } catch { setBrief('Could not load brief.'); }
    finally { setBriefLoading(false); }
  };

  const runCascade = async () => {
    setCascadeLoading(true);
    try {
      const data = await api.getCascadeCheck(conjunctionId);
      setCascade(data.induced_risks ?? []);
      setCascadeChecked(true);
    } catch {
      setCascade([]);
      setCascadeChecked(true);
    } finally { setCascadeLoading(false); }
  };

  // Safety Shield: auto-reject maneuvers inducing new CRITICAL/HIGH risks, search for alternatives
  const hasDangerousInduced = cascade.some(r => r.risk_level === 'CRITICAL' || r.risk_level === 'HIGH');
  const shieldBlocks = cascadeChecked && hasDangerousInduced && !shieldOverride;

  useEffect(() => {
    if (!cascadeChecked || !hasDangerousInduced || shieldOverride || !sweep.length || shieldSearching) return;
    setShieldSearching(true);
    const id = setTimeout(() => {
      const candidates = sweep
        .filter(o => o.post_miss_km >= Math.min(5, (selected?.post_miss_km ?? 5)))
        .sort((a, b) => b.post_miss_km - a.post_miss_km || a.delta_v_ms - b.delta_v_ms);
      const alt = candidates[Math.floor(candidates.length * 0.6)] ?? candidates[candidates.length - 1];
      if (alt) {
        const dvi = dvValues.findIndex(v => Math.abs(v - alt.delta_v_ms) < 0.001);
        const ti = tValues.findIndex(v => Math.abs(v - alt.time_before_tca_hours) < 0.01);
        if (dvi >= 0) setDvIdx(dvi);
        if (ti >= 0) setTIdx(ti);
        void compute(alt.delta_v_ms, alt.time_before_tca_hours).finally(() => {
          setTimeout(runCascade, 150);
          setShieldSearching(false);
        });
        return;
      }
      setShieldSearching(false);
    }, 500);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cascadeChecked, hasDangerousInduced, shieldOverride, sweep.length]);

  // Run conflict resolution if selected conjunction is between maneuverable satellites
  useEffect(() => {
    const solved = solveConflict(event, Object.assign({}, knownNames, NORAD_NAMES));
    setConflict(solved);
    setShowConflict(false);
  }, [conjunctionId, event, knownNames]);

  useEffect(() => {
    setResult(null); setSweep([]); setBrief(null);
    setBriefQ(null); setCascade([]); setCascadeChecked(false);
    setShowWhatIf(false); setShieldOverride(false); setShowConflict(false);
  }, [conjunctionId]);

  return (
    <div className="space-y-3 mt-4 border-t border-white/10 pt-4">

      {/* ── Compute button ───────────────────────────────── */}
      {!result && (
        <motion.button
          className="w-full py-3 rounded-xl font-semibold text-sm
            bg-gradient-to-r from-blue-600 to-purple-600
            hover:from-blue-500 hover:to-purple-500
            disabled:opacity-40 disabled:cursor-not-allowed
            flex items-center justify-center gap-2"
          whileHover={{ scale: loading ? 1 : 1.02 }}
          whileTap={{ scale: loading ? 1 : 0.97 }}
          onClick={() => compute()}
          disabled={loading}
        >
          {loading ? (
            <>
              <Spinner />
              Solving Clohessy-Wiltshire equations…
            </>
          ) : '⚡ Compute Avoidance Maneuver'}
        </motion.button>
      )}

      {error && <p className="text-red-400 text-xs text-center">{error}</p>}

      {/* ── Results ──────────────────────────────────────── */}
      <AnimatePresence>
      {result && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={sp}
          className="space-y-3"
        >
          {/* recommended burn summary */}
          <div className="glass rounded-xl p-3">
            <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Recommended Burn</div>
            <div className="font-mono text-sm text-white">{result.maneuver.burn_description}</div>
            {shieldSearching && (
              <div className="mt-2 text-[10px] text-amber-400">
                🛡️ Safety Shield searching for alternative burn…
              </div>
            )}
          </div>

          {/* Safety Shield rejection banner */}
          {shieldBlocks && !shieldSearching && (
            <div className="rounded-xl p-3 border border-red-500/40 bg-red-500/10 text-[11px] text-red-300 space-y-2">
              <div className="flex items-center gap-2 font-semibold text-red-300">
                <span>🛡️</span>
                <span>MANEUVER REJECTED — Induced conjunction detected</span>
              </div>
              <div>
                This maneuver avoids the primary threat but creates a new {cascade.find(c => c.risk_level === 'CRITICAL' || c.risk_level === 'HIGH')?.risk_level ?? 'HIGH'}-risk approach in {cascade[0]?.miss_distance_km.toFixed(2)} km.
              </div>
              <button
                onClick={() => setShieldOverride(true)}
                className="text-[10px] px-2 py-1 rounded-md border border-red-500/40 hover:bg-red-500/10"
              >⚠ Override (accept induced risk)</button>
            </div>
          )}

          {/* before / after grid */}
          <div className="grid grid-cols-2 gap-2">
            <Stat label="Miss Distance" bad={`${originalMiss.toFixed(2)} km`}
              good={<><StatCounter value={result.performance.post_miss_km} decimals={2} /> km</>}
              sub={`↑ ${result.performance.miss_distance_improvement.toFixed(1)}×`} green />

            <Stat label="Collision Prob" bad={originalPc.toExponential(1)}
              good={result.performance.post_pc.toExponential(1)}
              sub={
                isFinite(result.performance.pc_reduction_factor)
                  ? `↓ ${result.performance.pc_reduction_factor.toFixed(0)}× reduction`
                  : '↓ ∞× reduction'
              } green />

            <Stat label="Delta-V"
              good={<><StatCounter value={result.maneuver.delta_v_ms} decimals={3} /> m/s</>}
              sub={`${result.maneuver.direction} burn`} />

            <Stat label="Propellant"
              good={<><StatCounter value={result.cost.propellant_kg} decimals={3} /> kg</>}
              sub={`${(result.cost.propellant_fraction * 100).toFixed(3)}% sat mass`} />
          </div>

          {/* timing */}
          <div className="glass rounded-xl px-3 py-2 flex justify-between text-xs">
            <span className="text-gray-500">Burn timing</span>
            <span className="font-mono text-white">{result.maneuver.time_before_tca_hours.toFixed(1)} h before TCA</span>
          </div>

          {/* ── What-If Simulator ──────────────────────── */}
          <div>
            <button
              className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
              onClick={() => setShowWhatIf(v => !v)}
            >
              {showWhatIf ? '▾' : '▸'}
              {' '}What-If Simulator
              {sweepLoading && <Spinner small />}
              {sweep.length > 0 && !sweepLoading && (
                <span className="text-gray-600">({sweep.length} options)</span>
              )}
            </button>

            <AnimatePresence>
            {showWhatIf && sweep.length > 0 && selected && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.25 }}
                className="mt-2 space-y-3"
              >
                <div className="glass rounded-xl p-3 grid grid-cols-3 gap-2 text-center text-xs">
                  <div>
                    <div className="text-gray-500">Miss</div>
                    <div className={`font-bold text-base ${selected.post_miss_km >= 5 ? 'text-green-400' : 'text-amber-400'}`}>
                      {selected.post_miss_km.toFixed(2)} km
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-500">ΔV</div>
                    <div className="font-bold text-base text-white">{selected.delta_v_ms.toFixed(3)} m/s</div>
                  </div>
                  <div>
                    <div className="text-gray-500">Fuel</div>
                    <div className="font-bold text-base text-white">{selected.propellant_cost_kg.toFixed(4)} kg</div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-[10px] text-gray-500 mb-1">
                    <span>Delta-V: <span className="text-white">{dvValues[dvIdx]?.toFixed(3)} m/s</span></span>
                    <span>{dvValues[0]?.toFixed(2)} → {dvValues[dvValues.length-1]?.toFixed(2)} m/s</span>
                  </div>
                  <input
                    type="range" min={0} max={dvValues.length - 1} step={1}
                    value={dvIdx}
                    onChange={e => setDvIdx(+e.target.value)}
                    className="w-full accent-blue-500 h-1"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-[10px] text-gray-500 mb-1">
                    <span>Burn timing: <span className="text-white">{tValues[tIdx]?.toFixed(1)} h before TCA</span></span>
                    <span>{tValues[0]?.toFixed(1)} → {tValues[tValues.length-1]?.toFixed(1)} h</span>
                  </div>
                  <input
                    type="range" min={0} max={tValues.length - 1} step={1}
                    value={tIdx}
                    onChange={e => setTIdx(+e.target.value)}
                    className="w-full accent-purple-500 h-1"
                  />
                </div>

                {dvChartData.length > 1 && (
                  <div>
                    <div className="text-[10px] text-gray-500 mb-1">
                      Post-maneuver miss distance vs ΔV  (timing fixed at {tValues[tIdx]?.toFixed(1)} h)
                    </div>
                    <ResponsiveContainer width="100%" height={110}>
                      <LineChart data={dvChartData} margin={{ top: 4, right: 4, bottom: 4, left: -24 }}>
                        <XAxis dataKey="dv" tick={{ fontSize: 8, fill: '#6b7280' }}
                          tickFormatter={(v: number) => v.toFixed(2)} />
                        <YAxis tick={{ fontSize: 8, fill: '#6b7280' }} />
                        <Tooltip
                          contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', fontSize: 10 }}
                          formatter={(v: number) => [`${v.toFixed(2)} km`, 'Post miss']}
                          labelFormatter={(v: number) => `ΔV = ${v} m/s`}
                        />
                        <ReferenceLine y={5} stroke="#22c55e" strokeDasharray="3 3"
                          label={{ value: '5 km safe', fill: '#22c55e', fontSize: 8 }} />
                        <ReferenceLine x={dvValues[dvIdx]} stroke="#60a5fa" strokeDasharray="3 3" />
                        <Line type="monotone" dataKey="miss"
                          stroke="#818cf8" strokeWidth={1.5} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}

                <div className="text-[10px] text-gray-600 text-center">
                  Recommended option: ΔV={result.maneuver.delta_v_ms.toFixed(3)} m/s,{' '}
                  {result.maneuver.time_before_tca_hours.toFixed(1)} h before TCA
                </div>
              </motion.div>
            )}
            </AnimatePresence>
          </div>

          {/* ── Mission Copilot ────────────────────────── */}
          <div>
            <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-2 font-semibold">
              Mission Copilot
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {([
                ['why_dangerous',     '⚠ Why dangerous?'],
                ['why_this_maneuver', '🛸 Why this burn?'],
                ['what_if_nothing',   '💥 If we do nothing?'],
                ['summary',           '📋 Summary'],
              ] as [string, string][]).map(([q, label]) => (
                <motion.button key={q}
                  className={`text-[11px] py-2 px-2 rounded-lg border transition-colors text-left
                    ${briefQ === q
                      ? 'border-blue-500/60 text-blue-300 bg-blue-500/10'
                      : 'border-white/8 text-gray-400 hover:border-white/25 hover:text-white'}`}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => loadBrief(q)}
                >
                  {label}
                </motion.button>
              ))}
            </div>

            <AnimatePresence>
            {brief && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-2 glass rounded-xl p-3 text-[11px] text-gray-300 leading-relaxed"
              >
                {briefLoading ? <Spinner small /> : brief}
              </motion.div>
            )}
            </AnimatePresence>
          </div>

          {/* ── Maneuver Safety Shield ──────────────── */}
          <div>
            <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-2 font-semibold flex items-center gap-1.5">
              🛡️ Maneuver Safety Shield
            </div>
            {!cascadeChecked ? (
              <motion.button
                className="w-full py-2 rounded-xl text-xs border border-cyan-500/30 text-cyan-400
                  hover:border-cyan-500/60 hover:bg-cyan-500/5 flex items-center justify-center gap-2"
                whileTap={{ scale: 0.97 }}
                onClick={runCascade}
                disabled={cascadeLoading}
              >
                {cascadeLoading ? <><Spinner small /> Scanning future trajectory…</> : '🔍 Scan future trajectory for induced conjunctions'}
              </motion.button>
            ) : (
              <AnimatePresence>
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={sp}
                >
                  {cascade.length === 0 ? (
                    <div className="flex items-center gap-2 text-xs text-green-400 glass rounded-xl p-3 border border-green-500/30">
                      <span>✓</span>
                      <div>
                        <div className="font-semibold">Shield PASSED</div>
                        <div className="text-[10px] text-green-400/80">No new conjunctions introduced. Corrected trajectory clear for next 168 hours.</div>
                      </div>
                    </div>
                  ) : (
                    <div className="glass rounded-xl p-3 space-y-2">
                      <div className="flex items-center gap-2 text-xs font-semibold">
                        {hasDangerousInduced ? (
                          <><span className="text-red-400">✕</span><span className="text-red-300">Shield FAILED — {cascade.length} induced risk{cascade.length > 1 ? 's' : ''}</span></>
                        ) : (
                          <><span className="text-amber-400">⚠</span><span className="text-amber-300">{cascade.length} minor induced approach{cascade.length > 1 ? 'es' : ''} — accepted</span></>
                        )}
                      </div>
                      {cascade.map((r, i) => (
                        <div key={i} className="text-[10px] flex justify-between items-center border-t border-white/5 pt-1.5 gap-2">
                          <span className="text-gray-400">vs {nameOf(r.norad_id_secondary, knownNames)}</span>
                          <span className="font-mono">{r.miss_distance_km.toFixed(1)} km</span>
                          <span className={`font-semibold ${
                            r.risk_level === 'CRITICAL' ? 'text-red-400'
                              : r.risk_level === 'HIGH' ? 'text-amber-400'
                              : r.risk_level === 'MEDIUM' ? 'text-yellow-400'
                              : 'text-green-400'
                          }`}>{r.risk_level}</span>
                        </div>
                      ))}
                      <div className="text-[10px] text-gray-600 pt-1 border-t border-white/5">
                        NASA CARA protocol: all post-burn trajectory windows scanned for ±168h.
                      </div>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            )}
          </div>

          {/* ── Conflict Resolution (Who Dodges?) ────────────── */}
          {conflict && (
            <div>
              <button
                className="text-xs text-fuchsia-400 hover:text-fuchsia-300 flex items-center gap-1"
                onClick={() => setShowConflict(v => !v)}
              >
                {showConflict ? '▾' : '▸'}
                {' '}⚖️ Multi-Operator Conflict Resolution (Who Dodges?)
              </button>
              <AnimatePresence>
                {showConflict && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.25 }}
                    className="mt-2 space-y-2"
                  >
                    <div className="glass rounded-xl p-3 space-y-2">
                      <div className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">
                        Game-Theoretic Options (ISRO CAM protocol)
                      </div>
                      {(['A','B','C','D'] as ConflictOption[]).map(k => {
                        const opt = conflict.options[k];
                        const isRec = conflict.recommended === k;
                        return (
                          <div key={k}
                            className={`rounded-lg p-2 border text-[11px] ${
                              isRec
                                ? 'border-fuchsia-500/50 bg-fuchsia-500/10'
                                : 'border-white/5'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-white">
                                {isRec && '⭐ '}Option {k}: {opt.label}
                              </span>
                              <span className={`font-mono text-[10px] ${
                                opt.score >= 80 ? 'text-green-400'
                                  : opt.score >= 50 ? 'text-yellow-400'
                                  : 'text-red-400'
                              }`}>score {opt.score}/100</span>
                            </div>
                            <div className="text-[10px] text-gray-400 mt-0.5">{opt.description}</div>
                            <div className="h-1 mt-1.5 rounded-full bg-white/5 overflow-hidden">
                              <div className="h-full rounded-full bg-fuchsia-400/60"
                                style={{ width: `${opt.score}%` }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="rounded-xl p-3 border border-fuchsia-500/30 bg-fuchsia-500/5 text-[11px] space-y-1.5">
                      <div className="flex items-center gap-2 text-fuchsia-300 font-semibold">
                        <span>🤝</span>
                        <span>AI RECOMMENDATION</span>
                      </div>
                      <div className="whitespace-pre-wrap leading-relaxed text-gray-200">
                        {conflict.rationale}
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-[10px] pt-1.5 border-t border-white/5">
                        <div className="glass rounded-lg p-1.5">
                          <div className="text-gray-500">{conflict.satelliteA.name} fuel</div>
                          <div className="font-mono text-white">{conflict.satelliteA.fuelMarginPct}% · crit {conflict.satelliteA.criticalityScore}</div>
                        </div>
                        <div className="glass rounded-lg p-1.5">
                          <div className="text-gray-500">{conflict.satelliteB.name} fuel</div>
                          <div className="font-mono text-white">{conflict.satelliteB.fuelMarginPct}% · crit {conflict.satelliteB.criticalityScore}</div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* recompute */}
          <motion.button
            className="w-full py-2 rounded-xl text-xs text-gray-500 border border-white/8
              hover:border-white/20 hover:text-gray-300"
            whileTap={{ scale: 0.97 }}
            onClick={() => {
              setResult(null); setSweep([]); setBrief(null); setBriefQ(null);
              setCascade([]); setCascadeChecked(false); setShowWhatIf(false);
              setShieldOverride(false);
            }}
          >
            ↺ Recompute
          </motion.button>
        </motion.div>
      )}
      </AnimatePresence>
    </div>
  );
};

function Spinner({ small }: { small?: boolean }) {
  return (
    <motion.span
      className={`inline-block rounded-full border-2 border-white border-t-transparent
        ${small ? 'w-3 h-3' : 'w-4 h-4'}`}
      animate={{ rotate: 360 }}
      transition={{ duration: 0.9, repeat: Infinity, ease: 'linear' }}
    />
  );
}

function Stat({
  label, bad, good, sub, green,
}: {
  label: string;
  bad?: React.ReactNode;
  good: React.ReactNode;
  sub?: string;
  green?: boolean;
}) {
  return (
    <div className="glass rounded-xl p-3">
      <div className="text-[10px] text-gray-500 mb-1">{label}</div>
      {bad && (
        <div className="text-red-400 line-through text-[11px] leading-tight mb-0.5">{bad}</div>
      )}
      <div className={`font-bold text-base leading-tight ${green ? 'text-green-400' : 'text-white'}`}>
        {good}
      </div>
      {sub && <div className={`text-[10px] mt-0.5 ${green ? 'text-green-500' : 'text-gray-500'}`}>{sub}</div>}
    </div>
  );
}

export default ManeuverPanel;
