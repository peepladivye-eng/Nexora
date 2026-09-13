/**
 * NEXORA ManeuverPanel
 * Shows computed avoidance maneuver with animated before/after stats
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell
} from 'recharts';
import api, { ManeuverResponse } from '../services/api';
import StatCounter from './StatCounter';

interface ManeuverPanelProps {
  conjunctionId: string;
  originalPc: number;
  originalMiss: number;
}

const spring = { type: 'spring' as const, stiffness: 280, damping: 28 };

export const ManeuverPanel = ({ conjunctionId, originalPc, originalMiss }: ManeuverPanelProps) => {
  const [loading, setLoading]         = useState(false);
  const [result, setResult]           = useState<ManeuverResponse | null>(null);
  const [error, setError]             = useState<string | null>(null);
  const [showSweep, setShowSweep]     = useState(false);
  const [sweepData, setSweepData]     = useState<any[]>([]);
  const [brief, setBrief]             = useState<string | null>(null);
  const [briefQ, setBriefQ]           = useState<string | null>(null);

  const compute = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const data = await api.getManeuver(conjunctionId);
      setResult(data);
    } catch (e: any) {
      setError(e?.response?.data?.detail ?? 'Maneuver computation failed');
    } finally {
      setLoading(false);
    }
  };

  const loadSweep = async () => {
    try {
      const data = await api.getManeuverSweep(conjunctionId);
      // Downsample to 20 points for chart
      const step = Math.max(1, Math.floor(data.options.length / 20));
      setSweepData(data.options.filter((_: any, i: number) => i % step === 0));
      setShowSweep(true);
    } catch { /* ignore */ }
  };

  const loadBrief = async (question: string) => {
    setBriefQ(question);
    setBrief(null);
    try {
      const data = await api.getManeuverBrief(conjunctionId, question);
      setBrief(data.brief);
    } catch { setBrief('Could not load brief.'); }
  };

  return (
    <div className="space-y-4 mt-4 border-t border-white/10 pt-4">
      {/* ── Compute button ── */}
      {!result && (
        <motion.button
          className="w-full py-3 rounded-xl font-semibold text-sm
            bg-gradient-to-r from-blue-600 to-purple-600
            hover:from-blue-500 hover:to-purple-500
            disabled:opacity-50 disabled:cursor-not-allowed
            flex items-center justify-center gap-2"
          whileHover={{ scale: loading ? 1 : 1.03 }}
          whileTap={{ scale: loading ? 1 : 0.97 }}
          onClick={compute}
          disabled={loading}
        >
          {loading ? (
            <>
              <motion.span
                className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full"
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              />
              Solving Clohessy-Wiltshire equations…
            </>
          ) : (
            '⚡ Compute Avoidance Maneuver'
          )}
        </motion.button>
      )}

      {error && (
        <p className="text-red-400 text-xs text-center">{error}</p>
      )}

      {/* ── Results ── */}
      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={spring}
            className="space-y-4"
          >
            {/* Burn summary */}
            <div className="glass p-3 text-sm">
              <div className="text-xs text-gray-400 mb-2 font-semibold uppercase tracking-wider">
                Recommended Burn
              </div>
              <div className="text-white font-mono text-base">
                {result.maneuver.burn_description}
              </div>
            </div>

            {/* Before / After grid */}
            <div className="grid grid-cols-2 gap-3">
              {/* Miss distance */}
              <div className="glass p-3">
                <div className="text-xs text-gray-400 mb-1">Miss Distance</div>
                <div className="flex items-end gap-1">
                  <span className="text-red-400 line-through text-sm">
                    {originalMiss.toFixed(2)}
                  </span>
                  <span className="text-gray-500 text-xs">→</span>
                  <span className="text-green-400 font-bold text-lg">
                    <StatCounter value={result.performance.post_miss_km} decimals={2} />
                  </span>
                  <span className="text-gray-400 text-xs">km</span>
                </div>
                <div className="text-green-400 text-xs mt-1">
                  ↑ {result.performance.miss_distance_improvement.toFixed(1)}× improvement
                </div>
              </div>

              {/* Collision probability */}
              <div className="glass p-3">
                <div className="text-xs text-gray-400 mb-1">Collision Prob</div>
                <div className="flex items-end gap-1">
                  <span className="text-red-400 line-through text-sm">
                    {originalPc.toExponential(1)}
                  </span>
                  <span className="text-gray-500 text-xs">→</span>
                  <span className="text-green-400 font-bold text-base font-mono">
                    {result.performance.post_pc.toExponential(1)}
                  </span>
                </div>
                <div className="text-green-400 text-xs mt-1">
                  ↓ {isFinite(result.performance.pc_reduction_factor)
                    ? result.performance.pc_reduction_factor.toFixed(0) + '× reduction'
                    : '∞× reduction'}
                </div>
              </div>

              {/* Delta-V */}
              <div className="glass p-3">
                <div className="text-xs text-gray-400 mb-1">Delta-V</div>
                <div className="text-white font-bold text-lg">
                  <StatCounter value={result.maneuver.delta_v_ms} decimals={3} suffix=" m/s" />
                </div>
                <div className="text-gray-400 text-xs mt-1 capitalize">
                  {result.maneuver.direction} burn
                </div>
              </div>

              {/* Fuel cost */}
              <div className="glass p-3">
                <div className="text-xs text-gray-400 mb-1">Propellant</div>
                <div className="text-white font-bold text-lg">
                  <StatCounter value={result.cost.propellant_kg} decimals={3} suffix=" kg" />
                </div>
                <div className="text-gray-400 text-xs mt-1">
                  {(result.cost.propellant_fraction * 100).toFixed(3)}% of sat mass
                </div>
              </div>
            </div>

            {/* Burn timing */}
            <div className="glass p-3 text-sm flex justify-between items-center">
              <span className="text-gray-400">Burn timing</span>
              <span className="font-mono text-white">
                {result.maneuver.time_before_tca_hours.toFixed(1)} h before TCA
              </span>
            </div>

            {/* AI Brief buttons */}
            <div>
              <div className="text-xs text-gray-400 mb-2 uppercase tracking-wider font-semibold">
                Mission Copilot
              </div>
              <div className="grid grid-cols-2 gap-2">
                {[
                  ['why_dangerous',      '⚠ Why dangerous?'],
                  ['why_this_maneuver',  '🛸 Why this burn?'],
                  ['what_if_nothing',    '💥 If we do nothing?'],
                  ['summary',            '📋 Summary'],
                ].map(([q, label]) => (
                  <motion.button
                    key={q}
                    className={`text-xs py-2 px-3 rounded-lg border transition-colors
                      ${briefQ === q
                        ? 'border-blue-500 text-blue-300 bg-blue-500/10'
                        : 'border-white/10 text-gray-400 hover:border-white/30 hover:text-white'}`}
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
                    transition={{ duration: 0.3 }}
                    className="mt-3 glass p-3 text-xs text-gray-300 leading-relaxed"
                  >
                    {brief}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Sweep chart toggle */}
            <button
              className="text-xs text-blue-400 hover:text-blue-300 underline"
              onClick={showSweep ? () => setShowSweep(false) : loadSweep}
            >
              {showSweep ? 'Hide' : 'Show'} delta-V sweep chart
            </button>

            <AnimatePresence>
              {showSweep && sweepData.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 200 }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  <div className="text-xs text-gray-400 mb-1">
                    Post-maneuver miss distance vs delta-V (m/s)
                  </div>
                  <ResponsiveContainer width="100%" height={160}>
                    <BarChart data={sweepData} margin={{ top: 4, right: 4, bottom: 4, left: -20 }}>
                      <XAxis
                        dataKey="delta_v_ms"
                        tick={{ fontSize: 9, fill: '#9ca3af' }}
                        tickFormatter={(v: number) => v.toFixed(2)}
                      />
                      <YAxis tick={{ fontSize: 9, fill: '#9ca3af' }} />
                      <Tooltip
                        contentStyle={{ background: '#111928', border: '1px solid #374151', fontSize: 11 }}
                        formatter={(v: number) => [`${v.toFixed(2)} km`, 'Post miss']}
                        labelFormatter={(v: number) => `ΔV = ${v.toFixed(3)} m/s`}
                      />
                      <Bar dataKey="post_miss_km" radius={[2, 2, 0, 0]}>
                        {sweepData.map((entry: any, i: number) => (
                          <Cell
                            key={i}
                            fill={entry.post_miss_km >= 5 ? '#22c55e' : '#f59e0b'}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Re-compute button */}
            <motion.button
              className="w-full py-2 rounded-lg text-xs text-gray-400 border border-white/10 hover:border-white/30"
              whileTap={{ scale: 0.97 }}
              onClick={() => { setResult(null); setBrief(null); setBriefQ(null); setShowSweep(false); }}
            >
              ↺ Recompute
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ManeuverPanel;
