/**
 * ORBITGUARD – SideNav
 * Left vertical icon navigation. Every icon is clickable and opens a
 * floating panel (Objects, Scenarios, Analytics, Settings). The active
 * panel is tracked in the store so only one is open at a time.
 */
import { motion } from 'framer-motion';
import { useOrbitGuard } from '../../store/orbitGuard';

const NAV_ITEMS = [
  { id: 'objects',     icon: '🛰', label: 'Objects'      },
  { id: 'scenarios',   icon: '🧪', label: 'Scenarios'    },
  { id: 'analytics',   icon: '📊', label: 'Analytics'    },
  { id: 'settings',    icon: '⚙', label: 'Settings'     },
  { id: 'about',       icon: '◉', label: 'About'        },
] as const;

export default function SideNav() {
  const activePanel = useOrbitGuard((s) => s.activePanel);
  const openPanel = useOrbitGuard((s) => s.openPanel);
  const conjunctionMode = useOrbitGuard((s) => s.conjunctionMode);
  const autoRotate = useOrbitGuard((s) => s.autoRotate);
  const setAutoRotate = useOrbitGuard((s) => s.setAutoRotate);

  return (
    <nav className="pointer-events-auto fixed left-0 top-14 bottom-0 w-[72px] glass
      flex flex-col items-center py-6 gap-2 border-r border-white/5 !rounded-none">
      {/* 3D view / overview */}
      <motion.button
        onClick={() => openPanel(null)}
        className={`relative w-12 h-12 rounded-xl flex flex-col items-center justify-center gap-0.5
          transition-all duration-200
          ${activePanel === null
            ? 'bg-blue-500/20 border border-blue-400/50 text-blue-300'
            : 'hover:bg-white/5 border border-transparent text-white/40 hover:text-white/80'}`}
        whileTap={{ scale: 0.92 }}
        title="3D View — close panels and return to the scene"
      >
        <span className="text-lg leading-none">🌐</span>
        <span className="text-[8px] tracking-wide leading-none opacity-70">3D</span>
      </motion.button>

      {NAV_ITEMS.map((item) => {
        const isActive = activePanel === item.id;
        const isAlert = item.id === 'scenarios' && conjunctionMode;
        return (
          <motion.button
            key={item.id}
            onClick={() => openPanel(item.id)}
            className={`
              relative w-12 h-12 rounded-xl flex flex-col items-center justify-center gap-0.5
              transition-all duration-200
              ${isActive
                ? 'bg-blue-500/20 border border-blue-400/50 text-blue-300'
                : 'hover:bg-white/5 border border-transparent text-white/40 hover:text-white/80'}
              ${isAlert ? 'border-red-400/60 bg-red-500/15 text-red-300 animate-pulse' : ''}
            `}
            whileTap={{ scale: 0.92 }}
            title={item.label}
          >
            <span className="text-lg leading-none">{item.icon}</span>
            <span className="text-[8px] tracking-wide leading-none opacity-70">
              {item.label.split(' ')[0]}
            </span>
            {isActive && (
              <motion.div
                className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 bg-blue-400 rounded-r"
                layoutId="sidenav-indicator"
              />
            )}
          </motion.button>
        );
      })}

      {/* auto-rotate toggle */}
      <motion.button
        onClick={() => setAutoRotate(!autoRotate)}
        className={`mt-auto mb-2 w-12 h-12 rounded-xl flex flex-col items-center justify-center gap-0.5
          border transition-all
          ${autoRotate
            ? 'bg-emerald-500/10 border-emerald-400/30 text-emerald-300'
            : 'bg-white/5 border-white/10 text-white/40'}`}
        whileTap={{ scale: 0.92 }}
        title={autoRotate ? 'Auto-rotate ON — click to pause' : 'Auto-rotate OFF — click to resume'}
      >
        <span className="text-base leading-none">{autoRotate ? '⏸' : '▶'}</span>
        <span className="text-[8px] tracking-wide leading-none opacity-70">SPIN</span>
      </motion.button>

      {/* compass */}
      <div className="mb-4 flex flex-col items-center gap-1 text-white/20">
        <div className="text-[10px] tracking-widest">N</div>
        <div className="w-8 h-8 rounded-full border border-white/10 flex items-center justify-center">
          <motion.div
            className="text-white/40 text-xs"
            animate={{ rotate: 360 }}
            transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
          >
            ◎
          </motion.div>
        </div>
      </div>
    </nav>
  );
}
