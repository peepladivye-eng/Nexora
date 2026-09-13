/**
 * ORBITGUARD – AboutPanel
 * Product story + guided demo walkthrough.
 */
import { motion, AnimatePresence } from 'framer-motion';
import { useOrbitGuard } from '../../store/orbitGuard';

const WALKTHROUGH = [
  { icon: '☀', text: 'You are viewing the live solar system — drag to rotate, scroll to zoom.' },
  { icon: '🌍', text: 'Click Earth to fly in. The debris field and satellites fade in as you approach.' },
  { icon: '🛰', text: 'Click any satellite to open its intelligence panel and telemetry.' },
  { icon: '⚠', text: 'Click a conjunction row to enter alert mode with countdown and 3D crossing view.' },
  { icon: '⚡', text: 'Run the maneuver simulation and watch the miss distance grow to safety.' },
  { icon: '🧪', text: 'Use the Scenarios panel (left rail) to switch demo stories in one click.' },
];

export default function AboutPanel() {
  const activePanel = useOrbitGuard((s) => s.activePanel);
  const openPanel = useOrbitGuard((s) => s.openPanel);
  const focusEarthOrbit = useOrbitGuard((s) => s.focusEarthOrbit);

  if (activePanel !== 'about') return null;

  return (
    <motion.aside
      className="pointer-events-auto glass fixed left-20 top-20 w-80 max-h-[70vh] overflow-y-auto p-4 z-50"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ type: 'spring', stiffness: 280, damping: 28 }}
    >
      <h2 className="text-sm font-bold text-white/80 uppercase tracking-widest mb-1">
        ◉ About ORBITGUARD
      </h2>
      <p className="text-[11px] text-white/40 mb-3">
        AI-assisted space debris conjunction detection, risk scoring and maneuver planning for LEO.
      </p>

      <div className="text-[10px] text-white/30 uppercase tracking-widest mb-1.5">Demo Walkthrough</div>
      <div className="space-y-2 mb-4">
        {WALKTHROUGH.map((w, i) => (
          <div key={i} className="flex items-start gap-2.5 px-3 py-2 rounded-lg bg-white/[0.03] border border-white/8">
            <span className="text-sm leading-none mt-0.5">{w.icon}</span>
            <span className="text-[11px] text-white/60 leading-relaxed">{w.text}</span>
          </div>
        ))}
      </div>

      <button
        onClick={() => { openPanel(null); focusEarthOrbit(4.2); }}
        className="w-full py-2.5 rounded-xl text-sm font-bold text-sky-300 bg-sky-500/10
          hover:bg-sky-500/20 border border-sky-400/30 hover:border-sky-400/60 transition-colors"
      >
        ▶ Start Guided Tour (fly to Earth)
      </button>
    </motion.aside>
  );
}
