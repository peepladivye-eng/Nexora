/**
 * ORBITGUARD – ZoomControls
 * Floating +/- and reset camera controls
 */
import { motion } from 'framer-motion';

const LEVELS = [
  { id: 'system',    label: 'System'    },
  { id: 'planetary', label: 'Planetary' },
  { id: 'regional',  label: 'Regional'  },
  { id: 'close',     label: 'Close'     },
];

export default function ZoomControls() {
  return (
    <div className="pointer-events-auto fixed right-6 bottom-24 flex flex-col gap-2">
      {/* zoom label */}
      <div className="glass px-3 py-2 text-center">
        <div className="text-[9px] text-white/40 uppercase tracking-widest mb-1">Zoom Level</div>
        <div className="flex gap-1">
          {LEVELS.map(l => (
            <button
              key={l.id}
              className="text-[9px] text-white/40 hover:text-white/80 px-1.5 py-0.5
                hover:bg-white/10 rounded transition-colors"
            >
              {l.label}
            </button>
          ))}
        </div>
      </div>

      {/* +/- */}
      {['+', '−', '◎'].map((icon, i) => (
        <motion.button
          key={i}
          className="w-9 h-9 glass rounded-xl flex items-center justify-center
            text-white/60 hover:text-white hover:bg-white/10 transition-colors text-lg font-light"
          whileTap={{ scale: 0.9 }}
          title={['Zoom in', 'Zoom out', 'Reset camera'][i]}
        >
          {icon}
        </motion.button>
      ))}
    </div>
  );
}
