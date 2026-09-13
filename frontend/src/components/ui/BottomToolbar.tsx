/**
 * ORBITGUARD – BottomToolbar
 * Layer toggles + risk legend (clickable) + time controls (working
 * pause/speed) + tagline.
 */
import { motion } from 'framer-motion';
import { useOrbitGuard } from '../../store/orbitGuard';

const RISK_DOTS = [
  { label: 'Safe',   color: '#22c55e' },
  { label: 'Watch',  color: '#eab308' },
  { label: 'Medium', color: '#f97316' },
  { label: 'High',   color: '#ef4444' },
];

const SPEEDS = [0.5, 1, 2, 4];

export default function BottomToolbar() {
  const showOrbits = useOrbitGuard((s) => s.showOrbits);
  const toggleOrbits = useOrbitGuard((s) => s.toggleOrbits);
  const showDebris = useOrbitGuard((s) => s.showDebris);
  const toggleDebris = useOrbitGuard((s) => s.toggleDebris);
  const showLabels = useOrbitGuard((s) => s.showLabels);
  const toggleLabels = useOrbitGuard((s) => s.toggleLabels);
  const showTrails = useOrbitGuard((s) => s.showTrails);
  const toggleTrails = useOrbitGuard((s) => s.toggleTrails);

  const riskMask = useOrbitGuard((s) => s.riskMask);
  const toggleRiskTier = useOrbitGuard((s) => s.toggleRiskTier);

  const simPaused = useOrbitGuard((s) => s.simPaused);
  const togglePause = useOrbitGuard((s) => s.togglePause);
  const simSpeed = useOrbitGuard((s) => s.simSpeed);
  const setSimSpeed = useOrbitGuard((s) => s.setSimSpeed);

  const TOGGLES = [
    { icon: '◯', label: 'Orbits', active: showOrbits, fn: toggleOrbits },
    { icon: '⚠', label: 'Debris', active: showDebris, fn: toggleDebris },
    { icon: '◌', label: 'Labels', active: showLabels, fn: toggleLabels },
    { icon: '✧', label: 'Trails', active: showTrails, fn: toggleTrails },
  ];

  return (
    <div className="pointer-events-auto fixed bottom-0 left-[72px] right-0 glass
      border-t border-white/5 h-16 flex items-center px-6 gap-6 !rounded-none">

      {/* Risk legend — each dot toggles a debris tier */}
      <div className="flex items-center gap-3" title="Click to show/hide debris by risk level">
        {RISK_DOTS.map((d, i) => (
          <motion.button
            key={d.label}
            onClick={() => toggleRiskTier(i)}
            className={`flex items-center gap-1.5 px-1.5 py-1 rounded transition-opacity
              ${riskMask[i] ? 'opacity-100' : 'opacity-30'}`}
            whileTap={{ scale: 0.92 }}
            title={`${riskMask[i] ? 'Hide' : 'Show'} ${d.label} debris`}
          >
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color, boxShadow: `0 0 6px ${d.color}` }} />
            <span className="text-[11px] text-white/50">{d.label}</span>
          </motion.button>
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
            title={`${t.active ? 'Hide' : 'Show'} ${t.label}`}
          >
            <span className="text-base leading-none">{t.icon}</span>
            <span>{t.label}</span>
          </motion.button>
        ))}
      </div>

      <div className="h-5 w-px bg-white/10" />

      {/* Time control */}
      <div className="flex items-center gap-2 ml-auto">
        <span className={`flex items-center gap-1.5 text-[11px] ${simPaused ? 'text-amber-400' : 'text-green-400'}`}>
          <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${simPaused ? 'bg-amber-400' : 'bg-green-400'}`} />
          {simPaused ? 'PAUSED' : 'LIVE'}
        </span>
        <motion.button
          onClick={togglePause}
          className="w-7 h-7 rounded-md bg-white/5 hover:bg-white/10 text-white/60 hover:text-white text-xs transition-colors"
          whileTap={{ scale: 0.9 }}
          title={simPaused ? 'Resume simulation' : 'Pause simulation'}
        >
          {simPaused ? '▶' : '⏸'}
        </motion.button>
        {SPEEDS.map(s => (
          <motion.button
            key={s}
            onClick={() => setSimSpeed(s)}
            className={`text-xs px-1.5 py-0.5 rounded transition-colors
              ${simSpeed === s && !simPaused
                ? 'text-sky-300 bg-sky-500/15 border border-sky-400/30'
                : 'text-white/40 hover:text-white/80 border border-transparent hover:border-white/10'}`}
            whileTap={{ scale: 0.9 }}
            title={`${s}× speed`}
          >
            {s}×
          </motion.button>
        ))}
        <span className="text-[10px] text-white/30 ml-3 tracking-widest uppercase hidden xl:block">
          A SAFER TOMORROW IN A CLEANER SKY
        </span>
      </div>
    </div>
  );
}
