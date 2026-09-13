/**
 * ORBITGUARD – StatsPanel
 * Top-right stat counters, wired to the store (scenario-swappable).
 */
import { motion, AnimatePresence } from 'framer-motion';
import { useOrbitGuard } from '../../store/orbitGuard';

export default function StatsPanel() {
  const stats = useOrbitGuard((s) => s.stats);

  const items = [
    { label: 'Tracked Objects', value: stats.trackedObjects.toLocaleString(), color: 'text-white' },
    { label: 'Active Alerts',   value: String(stats.activeAlerts),           color: 'text-red-400' },
    { label: 'Collision Risks', value: String(stats.collisionRisks),         color: 'text-orange-400' },
  ];

  return (
    <div className="pointer-events-auto fixed top-20 right-6 flex gap-3">
      {items.map((s, i) => (
        <motion.div
          key={s.label}
          className="glass px-5 py-3 text-center min-w-[100px]"
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 + i * 0.08 }}
        >
          <AnimatePresence mode="popLayout">
            <motion.div
              key={s.value}
              className={`text-2xl font-black tabular-nums ${s.color}`}
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 6 }}
              transition={{ duration: 0.25 }}
            >
              {s.value}
            </motion.div>
          </AnimatePresence>
          <div className="text-[10px] text-white/50 tracking-widest uppercase mt-1">
            {s.label}
          </div>
        </motion.div>
      ))}
    </div>
  );
}
