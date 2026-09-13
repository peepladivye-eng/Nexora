/**
 * ORBITGUARD – ScenariosPanel
 * All demo scenarios in one place. Picking one reconfigures the whole
 * app: stats, alerts, conjunctions and the 3D alert state.
 */
import { motion, AnimatePresence } from 'framer-motion';
import { useOrbitGuard } from '../../store/orbitGuard';
import { CONJUNCTIONS_BY_SCENARIO, applyScenario } from '../../services/scenariosBridge';

const SCENARIOS = [
  { id: 'critical',    icon: '🚨', name: 'Critical Alert',  desc: 'Single emergency-level conjunction' },
  { id: 'high',        icon: '⚡', name: 'High Activity',   desc: 'Multiple CRITICAL/HIGH events' },
  { id: 'typical',     icon: '📊', name: 'Typical Ops',     desc: 'Realistic mixed-risk day' },
  { id: 'educational', icon: '🎓', name: 'Educational',     desc: 'One event per risk level' },
  { id: 'quiet',       icon: '✅', name: 'Quiet Ops',       desc: 'Routine monitoring, minimal risk' },
  { id: 'live',        icon: '🛰', name: 'Live Data',       desc: 'Backend screening (if running)' },
];

export default function ScenariosPanel() {
  const activePanel = useOrbitGuard((s) => s.activePanel);
  const activeScenario = useOrbitGuard((s) => s.activeScenario);
  const setScenario = useOrbitGuard((s) => s.setScenario);
  const triggerAlert = useOrbitGuard((s) => s.triggerAlert);
  const dismissAlert = useOrbitGuard((s) => s.dismissAlert);
  const setStats = useOrbitGuard((s) => s.setStats);

  const onPick = (id: string) => {
    const applied = applyScenario(id, CONJUNCTIONS_BY_SCENARIO);
    setScenario(id);
    setStats(applied.stats);
    dismissAlert();
    // auto-trigger the headline event so the demo starts instantly
    if (applied.headline) triggerAlert(applied.headline);
  };

  return (
    <AnimatePresence>
      {activePanel === 'scenarios' && (
        <motion.aside
          className="pointer-events-auto glass fixed left-[84px] top-16 w-80 max-h-[70vh] overflow-y-auto p-4"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ type: 'spring', stiffness: 280, damping: 28 }}
        >
          <h2 className="text-sm font-bold text-white/80 uppercase tracking-widest mb-1">
            🧪 Demo Scenarios
          </h2>
          <p className="text-[11px] text-white/40 mb-3">
            One click configures the full demo. The headline event triggers automatically.
          </p>

          <div className="space-y-2">
            {SCENARIOS.map((s) => {
              const active = activeScenario === s.id;
              return (
                <motion.button
                  key={s.id}
                  onClick={() => onPick(s.id)}
                  className={`w-full text-left rounded-xl px-3 py-2.5 border transition-all
                    ${active
                      ? 'bg-sky-500/15 border-sky-400/40'
                      : 'bg-white/[0.03] border-white/8 hover:bg-white/[0.07] hover:border-white/20'}`}
                  whileHover={{ x: 2 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{s.icon}</span>
                    <span className={`text-sm font-semibold ${active ? 'text-sky-300' : 'text-white/85'}`}>
                      {s.name}
                    </span>
                    {active && (
                      <span className="ml-auto text-[9px] px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-400/30">
                        ACTIVE
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-white/40 mt-0.5">{s.desc}</div>
                </motion.button>
              );
            })}
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
