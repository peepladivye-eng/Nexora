/**
 * ORBITGUARD – BottomToolbar
 * Layer toggles + time control + risk legend
 */
import { motion } from 'framer-motion';
import { useOrbitGuard } from '../../store/orbitGuard';

const RISK_DOTS = [
  { label: 'Safe',   color: '#22c55e' },
  { label: 'Watch',  color: '#eab308' },
  { label: 'Medium', color: '#f97316' },
  { label: 'High',   color: '#ef4444' },
];

export default function BottomToolbar() {
  const {
    showOrbits, toggleOrbits,
    showDebris, toggleDebris,
    showLabels, toggleLabels,
    showTrails, toggleTrails,
  } = useOrbitGuard();

  const TOGGLES = [
    { icon: '◯', label: 'Orbits', active: showOrbits, fn: toggleOrbits },
    { icon: '⚠', label: 'Debris', active: showDebris, fn: toggleDebris },
    { icon: '◌', label: 'Labels', active: showLabels, fn: toggleLabels },
    { icon: '✧', label: 'Trails', active: showTrails, fn: toggleTrails },
  ];

  return (
    <div className="pointer-events-auto fixed bottom-0 left-[72px] right-0 glass
      border-t border-white/5 h-16 flex items-center px-6 gap-6">

      {/* Risk legend */}
      <div className="flex items-center gap-3">
        {RISK_DOTS.map(d => (
          <div key={d.label} className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color, boxShadow: `0 0 6px ${d.color}` }} />
            <span className="text-[11px] text-white/50">{d.label}</span>
          </div>
        ))}
      </div>

      <div className="h-5 w-px bg-white/10" />

      {/* Layer toggles */}
      <div className="flex items-center gap-2">
        {TOGGLES.map(t => (
          <motion.button
            key={t.label}
            onClick={t.fn}
            className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg
              transition-colors text-[11px]
              ${t.active
                ? 'text-blue-300 bg-blue-500/15 border border-blue-400/30'
                : 'text-white/40 hover:text-white/70 border border-transparent hover:border-white/10'}`}
            whileTap={{ scale: 0.93 }}
          >
            <span className="text-base leading-none">{t.icon}</span>
            <span>{t.label}</span>
          </motion.button>
        ))}
      </div>

      <div className="h-5 w-px bg-white/10" />

      {/* Time control */}
      <div className="flex items-center gap-3 ml-auto">
        <span className="flex items-center gap-1.5 text-[11px] text-green-400">
          <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
          LIVE
        </span>
        {['◀', '▶', '⏸', '1×'].map(c => (
          <motion.button
            key={c}
            className="text-white/40 hover:text-white text-sm transition-colors px-1"
            whileTap={{ scale: 0.9 }}
          >
            {c}
          </motion.button>
        ))}
        <span className="text-[10px] text-white/30 ml-3 tracking-widest uppercase hidden xl:block">
          A SAFER TOMORROW IN A CLEANER SKY
        </span>
      </div>
    </div>
  );
}
