/**
 * ORBITGUARD – ZoomControls
 * Working +/-/reset camera controls and zoom-level shortcuts.
 */
import { motion } from 'framer-motion';
import { useOrbitGuard, ZoomLevel } from '../../store/orbitGuard';

const LEVELS: { id: ZoomLevel; label: string }[] = [
  { id: 'system',    label: 'System'    },
  { id: 'planetary', label: 'Planetary' },
  { id: 'regional',  label: 'Regional'  },
  { id: 'close',     label: 'Close'     },
];

export default function ZoomControls() {
  const zoomIn = useOrbitGuard((s) => s.zoomIn);
  const zoomOut = useOrbitGuard((s) => s.zoomOut);
  const requestOverview = useOrbitGuard((s) => s.requestOverview);
  const zoomLevel = useOrbitGuard((s) => s.zoomLevel);
  const focusEarthOrbit = useOrbitGuard((s) => s.focusEarthOrbit);

  const onLevel = (lvl: ZoomLevel) => {
    if (lvl === 'system') requestOverview();
    else focusEarthOrbit(lvl === 'planetary' ? 35 : lvl === 'regional' ? 18 : 8);
  };

  return (
    <div className="pointer-events-auto fixed right-6 bottom-24 flex flex-col gap-2 items-end">
      {/* zoom level chips */}
      <div className="glass px-3 py-2 text-center">
        <div className="text-[9px] text-white/40 uppercase tracking-widest mb-1">Zoom Level</div>
        <div className="flex gap-1">
          {LEVELS.map(l => (
            <button
              key={l.id}
              onClick={() => onLevel(l.id)}
              className={`text-[9px] px-1.5 py-0.5 rounded transition-colors ${
                zoomLevel === l.id
                  ? 'text-sky-300 bg-sky-500/15 border border-sky-400/30'
                  : 'text-white/40 hover:text-white/80 hover:bg-white/10 border border-transparent'
              }`}
            >
              {l.label}
            </button>
          ))}
        </div>
      </div>

      {/* + / − / reset */}
      {[
        { icon: '+', title: 'Zoom in',  fn: zoomIn },
        { icon: '−', title: 'Zoom out', fn: zoomOut },
        { icon: '◎', title: 'Reset camera (system view)', fn: requestOverview },
      ].map(({ icon, title, fn }) => (
        <motion.button
          key={icon}
          onClick={fn}
          className="w-9 h-9 glass rounded-xl flex items-center justify-center
            text-white/60 hover:text-white hover:bg-white/10 transition-colors text-lg font-light"
          whileTap={{ scale: 0.9 }}
          title={title}
        >
          {icon}
        </motion.button>
      ))}
    </div>
  );
}
