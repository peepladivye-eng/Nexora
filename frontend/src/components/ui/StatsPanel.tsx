/**
 * ORBITGUARD – StatsPanel
 * Top-right stat counters: Tracked Objects, Active Alerts, Collision Risks
 */
import { motion } from 'framer-motion';

const STATS = [
  { label: 'Tracked Objects', value: '34,218', color: 'text-white' },
  { label: 'Active Alerts',   value: '12',     color: 'text-red-400' },
  { label: 'Collision Risks', value: '3',      color: 'text-orange-400' },
];

export default function StatsPanel() {
  return (
    <div className="pointer-events-auto fixed top-20 right-6 flex gap-3">
      {STATS.map((s, i) => (
        <motion.div
          key={s.label}
          className="glass px-5 py-3 text-center min-w-[100px]"
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 + i * 0.08 }}
        >
          <div className="text-[10px] text-white/50 tracking-widest uppercase mb-1">
            {s.label}
          </div>
          <div className={`text-2xl font-black tabular-nums ${s.color}`}>
            {s.value}
          </div>
        </motion.div>
      ))}
    </div>
  );
}
