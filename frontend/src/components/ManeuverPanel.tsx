/**
 * NEXORA – ManeuverPanel
 * Maneuver computation + What-If simulator + Mission Copilot + Cascading risk check
 */

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, ReferenceLine, Scatter, ScatterChart, ZAxis
} from 'recharts';
import api, { ManeuverResponse } from '../services/api';
import StatCounter from './StatCounter';

interface ManeuverPanelProps {
  conjunctionId: string;
  originalPc: number;
  originalMiss: number;
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

// ── snap to nearest grid point ────────────────────────────────
function snapToGrid(sweepData: SweepOption[], dvIdx: number, tIdx: number) {
  const dvValues  = [...new Set(sweepData.map(o => o.delta_v_ms))].sort((a, b) => a - b);
  const tValues   = [...new Set(sweepData.map(o => o.time_before_tca_hours))].sort((a, b) => a - b);
  const dv = dvValues[Math.min(dvIdx, dvValues.length - 1)];
  const t  = tValues[Math.min(tIdx,  tValues.length  - 1)];
  return sweepData.find(o => o.delta_v_ms === dv && Math.abs(o.time_before_tca_hours - t) < 0.01)
      ?? sweepData[0];
}

export const ManeuverPanel = ({ conjunctionId, originalPc, originalMiss }: ManeuverPanelProps) => {
  const [loading, setLoading]       = useState(false);
  const [result, setResult]         = useState<ManeuverResponse | null>(null);
  const [error, setError]           = useState<string | null>(null);

  // sweep / what-if
  const [sweep, setSweep]           = useState<SweepOption[]>([]);
  const [sweepLoading, setSweepLoading] = useState(false);
  const [showWhatIf, setShowWhatIf] = useState(false);
  const [dvIdx, setDvIdx]           = useState(0);
  const [tIdx, setTIdx]             = useState(0);

  // brief / copilot
  const [brief, setBrief]           = useState<string | null>(null);
  const [briefQ, setBriefQ]         = useState<string | null>(null);
  const [briefLoading, setBriefLoading] = useState(false);

  // cascading check
  const [cascade, setCascade]       = useState<CascadeRisk[]>([]);
  const [cascadeLoading, setCascadeLoading] = useState(false);
  const [cascadeChecked, setCascadeChecked] = useState(false);

  // ── compute main maneuver ──────────────────────────────────
  const compute = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    setSweep([]);
    setShowWhatIf(false);
    setCascadeChecked(false);
    setCascade([]);
    try {
      const data = await api.getManeuver(conjunctionId);
      setResult(data);
      // kick off sweep in background immediately after
      loadSweep();
    } catch (e: any) {
      setError(e?.response?.data?.detail ?? 'Maneuver computation failed');
    } finally {
      setLoading(false);
    }
  };

  // ── load sweep (runs automatically after compute) ─────────
  const loadSweep = async () => {
    setSweepLoading(true);
    try {
      const data = await api.getManeuverSweep(conjunctionId);
      const opts: SweepOption[] = data.options ?? [];
      setSweep(opts);
      // default slider positions to the recommended option
      const rec = data.recommended;
      if (rec && opts.length) {
        const dvVals = [...new Set(opts.map((o: SweepOption) => o.delta_v_ms))].sort((a, b) => a - b);
        const tVals  = [...new Set(opts.map((o: SweepOption) => o.time_before_tca_hours))].sort((a, b) => a - b);
        setDvIdx(dvVals.findIndex((v: number) => Math.abs(v - rec.delta_v_ms) < 0.001) || 0);
        setTIdx(tVals.findIndex((v: number) => Math.abs(v - rec.time_before_tca_hours) < 0.01) || 0);
      }
    } catch { /* ignore — sweep is optional */ }
    finally { setSweepLoading(false); }
  };

  // ── what-if selected point ─────────────────────────────────
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

  // chart: miss distance vs delta-v at fixed timing
  const dvChartData = useMemo(() => {
    if (!sweep.length || !tValues.length) return [];
    const tFixed = tValues[tIdx] ?? tValues[0];
    return sweep
      .filter(o => Math.abs(o.time_before_tca_hours - tFixed) < 0.01)
      .sort((a, b) => a.delta_v_ms - b.delta_v_ms)
      .map(o => ({ dv: +o.delta_v_ms.toFixed(3), miss: +o.post_miss_km.toFixed(2) }));
  }, [sweep, tValues, tIdx]);

  // ── load brief ─────────────────────────────────────────────
  const loadBrief = async (q: string) => {
    setBriefQ(q); setBrief(null); setBriefLoading(true);
    try {
      const data = await api.getManeuverBrief(conjunctionId, q);
      setBrief(data.brief);
    } catch { setBrief('Could not load brief.'); }
    finally { setBriefLoading(false); }
  };

  // ── cascading check ────────────────────────────────────────
  const runCascade = async () => {
    setCascadeLoading(true);
    try {
      const data = await api.getCascadeCheck(conjunctionId);
      setCascade(data.induced_risks ?? []);
      setCascadeChecked(true);
    } catch {
      setCascade([]);
      setCascadeChecked(true);
    } finally {
      setCascadeLoading(false);
    }
  };

  // reset when conjunction changes
  useEffect(() => {
    setResult(null); setSweep([]); setBrief(null);
    setBriefQ(null); setCascade([]); setCascadeChecked(false);
    setShowWhatIf(false);
  }, [conjunctionId]);

  /* ═══════════════════════════════ RENDER ══════════════════ */
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
          onClick={compute}
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
          </div>

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
                {/* live readout of selected point */}
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

                {/* delta-v slider */}
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

                {/* timing slider */}
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

                {/* miss distance vs delta-v chart */}
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

                {/* recommended marker */}
                {result && (
                  <div className="text-[10px] text-gray-600 text-center">
                    Recommended option: ΔV={result.maneuver.delta_v_ms.toFixed(3)} m/s,{' '}
                    {result.maneuver.time_before_tca_hours.toFixed(1)} h before TCA
                  </div>
                )}
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

          {/* ── Cascading Collision Check ──────────────── */}
          <div>
            {!cascadeChecked ? (
              <motion.button
                className="w-full py-2 rounded-xl text-xs border border-amber-500/30 text-amber-400
                  hover:border-amber-500/60 hover:bg-amber-500/5 flex items-center justify-center gap-2"
                whileTap={{ scale: 0.97 }}
                onClick={runCascade}
                disabled={cascadeLoading}
              >
                {cascadeLoading ? <><Spinner small /> Running cascading risk check…</> : '🔍 Check for induced risks after maneuver'}
              </motion.button>
            ) : (
              <AnimatePresence>
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={sp}
                >
                  {cascade.length === 0 ? (
                    <div className="flex items-center gap-2 text-xs text-green-400 glass rounded-xl p-3">
                      <span>✓</span>
                      <span>No new risks introduced by this maneuver. Corrected trajectory is clear.</span>
                    </div>
                  ) : (
                    <div className="glass rounded-xl p-3 space-y-2">
                      <div className="flex items-center gap-2 text-xs text-amber-400 font-semibold">
                        <span>⚠</span>
                        <span>
                          This maneuver introduces {cascade.length} new risk{cascade.length > 1 ? 's' : ''}
                        </span>
                      </div>
                      {cascade.map((r, i) => (
                        <div key={i} className="text-[10px] flex justify-between items-center
                          border-t border-white/5 pt-1.5">
                          <span className="text-gray-400">vs {r.norad_id_secondary}</span>
                          <span className="font-mono">{r.miss_distance_km.toFixed(1)} km</span>
                          <span className={`font-semibold ${
                            r.risk_level === 'HIGH' ? 'text-amber-400' : 'text-yellow-400'
                          }`}>{r.risk_level}</span>
                        </div>
                      ))}
                      <div className="text-[10px] text-gray-600 pt-1">
                        Consider adjusting burn timing or magnitude to avoid induced risks.
                      </div>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            )}
          </div>

          {/* recompute */}
          <motion.button
            className="w-full py-2 rounded-xl text-xs text-gray-500 border border-white/8
              hover:border-white/20 hover:text-gray-300"
            whileTap={{ scale: 0.97 }}
            onClick={() => {
              setResult(null); setSweep([]); setBrief(null); setBriefQ(null);
              setCascade([]); setCascadeChecked(false); setShowWhatIf(false);
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

/* ── small helpers ─────────────────────────────────────────── */

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
