/**
 * ORBITGUARD – SettingsPanel
 * Mission settings: display options, simulation speed, auto-rotate.
 */
import { motion, AnimatePresence } from 'framer-motion';
import { useOrbitGuard } from '../../store/orbitGuard';

const SPEEDS = [0.5, 1, 2, 4];

function Toggle({ label, desc, on, onClick }: { label: string; desc: string; on: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg bg-white/[0.03]
        border border-white/8 hover:bg-white/[0.07] transition-all"
    >
      <span className="text-left">
        <span className="block text-xs text-white/85">{label}</span>
        <span className="block text-[10px] text-white/35">{desc}</span>
      </span>
      <span
        className={`w-9 h-5 rounded-full p-0.5 transition-colors ${on ? 'bg-sky-500/70' : 'bg-white/10'}`}
      >
        <motion.span
          className="block w-4 h-4 rounded-full bg-white shadow"
          animate={{ x: on ? 16 : 0 }}
          transition={{ type: 'spring', stiffness: 400, damping: 28 }}
        />
      </span>
    </button>
  );
}

export default function SettingsPanel() {
  const activePanel = useOrbitGuard((s) => s.activePanel);
  const showOrbits = useOrbitGuard((s) => s.showOrbits);
  const toggleOrbits = useOrbitGuard((s) => s.toggleOrbits);
  const showDebris = useOrbitGuard((s) => s.showDebris);
  const toggleDebris = useOrbitGuard((s) => s.toggleDebris);
  const showLabels = useOrbitGuard((s) => s.showLabels);
  const toggleLabels = useOrbitGuard((s) => s.toggleLabels);
  const showTrails = useOrbitGuard((s) => s.showTrails);
  const toggleTrails = useOrbitGuard((s) => s.toggleTrails);
  const autoRotate = useOrbitGuard((s) => s.autoRotate);
  const setAutoRotate = useOrbitGuard((s) => s.setAutoRotate);
  const simSpeed = useOrbitGuard((s) => s.simSpeed);
  const setSimSpeed = useOrbitGuard((s) => s.setSimSpeed);

  if (activePanel !== 'settings') return null;

  return (
    <motion.aside
      className="pointer-events-auto glass fixed left-20 top-20 w-80 max-h-[70vh] overflow-y-auto p-4 z-50"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ type: 'spring', stiffness: 280, damping: 28 }}
    >
      <h2 className="text-sm font-bold text-white/80 uppercase tracking-widest mb-1">
        ⚙ Mission Settings
      </h2>
      <p className="text-[11px] text-white/40 mb-3">Display layers and simulation options.</p>

      <div className="space-y-1.5">
        <Toggle label="Orbit rings" desc="Planetary orbit lines" on={showOrbits} onClick={toggleOrbits} />
        <Toggle label="Debris field" desc="Trackable debris around Earth" on={showDebris} onClick={toggleDebris} />
        <Toggle label="Labels" desc="Object name labels" on={showLabels} onClick={toggleLabels} />
        <Toggle label="Orbit trails" desc="Satellite orbit traces" on={showTrails} onClick={toggleTrails} />
        <Toggle label="Auto-rotate camera" desc="Slow cinematic drift when idle" on={autoRotate} onClick={() => setAutoRotate(!autoRotate)} />
      </div>

      <div className="mt-4">
        <div className="text-[10px] text-white/30 uppercase tracking-widest mb-1.5">Simulation Speed</div>
        <div className="flex gap-1.5">
          {SPEEDS.map(s => (
            <button
              key={s}
              onClick={() => setSimSpeed(s)}
              className={`flex-1 text-xs px-2 py-1.5 rounded-lg border transition-colors
                ${simSpeed === s
                  ? 'text-sky-300 bg-sky-500/15 border-sky-400/30'
                  : 'text-white/40 hover:text-white/80 border-white/10 hover:border-white/25'}`}
            >
              {s}×
            </button>
          ))}
        </div>
      </div>
    </motion.aside>
  );
}
