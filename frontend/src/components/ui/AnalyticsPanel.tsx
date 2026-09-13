/**
 * ORBITGUARD – AnalyticsPanel
 * Risk Analysis view: scenario conjunctions broken down by risk level
 * with animated bars, plus the current alert queue.
 */
import { motion, AnimatePresence } from 'framer-motion';
import { useMemo } from 'react';
import { useOrbitGuard } from '../../store/orbitGuard';
import { getConjunctionsFor } from '../../services/scenariosBridge';
import { SAT_NAME_BY_ID } from '../../data/satellites';
import { MAJOR_SATELLITES } from '../../data/satellites';

const RISK_ORDER = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as const;
const RISK_COLOR: Record<string, string> = {
  CRITICAL: '#ef4444', HIGH: '#f97316', MEDIUM: '#eab308', LOW: '#22c55e',
};

export default function AnalyticsPanel() {
  const activePanel = useOrbitGuard((s) => s.activePanel);
  const conjunctionMode = useOrbitGuard((s) => s.conjunctionMode);
  const stats = useOrbitGuard((s) => s.stats);
  const triggerAlert = useOrbitGuard((s) => s.triggerAlert);

  const counts = useMemo(() => {
    const c: Record<string, number> = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 };
    MAJOR_SATELLITES.forEach((s) => {
      getConjunctionsFor(s.id).forEach((cj) => {
        if (c[cj.risk] !== undefined) c[cj.risk]++;
      });
    });
    return c;
  }, []);

  const total = Object.values(counts).reduce((a, b) => a + b, 0) || 1;

  return (
    <AnimatePresence>
      {activePanel === 'analytics' && (
        <motion.aside
          className="pointer-events-auto glass fixed left-[84px] top-16 w-80 max-h-[70vh] overflow-y-auto p-4"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ type: 'spring', stiffness: 280, damping: 28 }}
        >
          <h2 className="text-sm font-bold text-white/80 uppercase tracking-widest mb-1">
            📊 Risk Analysis
          </h2>
          <p className="text-[11px] text-white/40 mb-3">
            Screening window: next 72 hours · {stats.trackedObjects.toLocaleString()} objects
          </p>

          {/* risk distribution */}
          <div className="space-y-2.5 mb-4">
            {RISK_ORDER.map((r) => (
              <div key={r}>
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="text-white/60">{r}</span>
                  <span className="text-white font-bold">{counts[r]}</span>
                </div>
                <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ backgroundColor: RISK_COLOR[r] }}
                    initial={{ width: 0 }}
                    animate={{ width: `${(counts[r] / total) * 100}%` }}
                    transition={{ duration: 0.7 }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* live queue */}
          <div className="text-[10px] text-white/30 uppercase tracking-widest mb-1.5">
            Active Alert Queue
          </div>
          {conjunctionMode ? (
            <div className="text-[11px] text-red-300 flex items-center gap-1.5 mb-2">
              <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
              Conjunction alert active — see banner
            </div>
          ) : (
            <div className="text-[11px] text-white/40 mb-2">No active alert. All clear.</div>
          )}

          <div className="space-y-1.5">
            {getConjunctionsFor('deb-48291').slice(0, 3).map((c) => (
              <button
                key={c.id}
                onClick={() => triggerAlert(c)}
                className="w-full text-left rounded-lg px-3 py-2 bg-white/[0.03] border border-white/8
                  hover:bg-white/[0.07] hover:border-white/20 transition-all flex items-center gap-2"
              >
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: RISK_COLOR[c.risk] }}
                />
                <span className="flex-1 truncate text-xs text-white/80">
                  {SAT_NAME_BY_ID[c.secondaryId] ?? c.secondaryId}
                </span>
                <span className="text-[10px] font-mono text-white/50">
                  {c.missDistanceKm < 1 ? `${Math.round(c.missDistanceKm * 1000)} m` : `${c.missDistanceKm.toFixed(1)} km`}
                </span>
                <span
                  className="text-[9px] px-1.5 py-0.5 rounded font-bold"
                  style={{ color: RISK_COLOR[c.risk], backgroundColor: RISK_COLOR[c.risk] + '22' }}
                >
                  {c.risk}
                </span>
              </button>
            ))}
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
