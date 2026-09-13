/**
 * ORBITGUARD – SideNav
 * Left vertical icon navigation
 */
import { useState } from 'react';
import { motion } from 'framer-motion';
import { useOrbitGuard } from '../../store/orbitGuard';

const NAV_ITEMS = [
  { id: '3d',           icon: '◉', label: '3D View'     },
  { id: 'satellites',   icon: '🛰', label: 'Satellites'  },
  { id: 'debris',       icon: '⚠', label: 'Debris'      },
  { id: 'conjunctions', icon: '⚡', label: 'Conjunctions'},
  { id: 'analytics',    icon: '📊', label: 'Analytics'  },
  { id: 'settings',     icon: '⚙', label: 'Settings'    },
];

export default function SideNav() {
  const [active, setActive] = useState('3d');
  const conjunctionMode = useOrbitGuard(s => s.conjunctionMode);

  return (
    <nav className="pointer-events-auto fixed left-0 top-14 bottom-0 w-[72px] glass
      flex flex-col items-center py-6 gap-2 border-r border-white/5">
      {NAV_ITEMS.map((item) => {
        const isActive = active === item.id;
        const isCritical = item.id === 'conjunctions' && conjunctionMode;
        return (
          <motion.button
            key={item.id}
            onClick={() => setActive(item.id)}
            className={`
              relative w-12 h-12 rounded-xl flex flex-col items-center justify-center gap-0.5
              transition-all duration-200 group
              ${isActive
                ? 'bg-blue-500/20 border border-blue-400/50 text-blue-300'
                : 'hover:bg-white/5 border border-transparent text-white/40 hover:text-white/80'}
              ${isCritical ? 'border-red-400/60 bg-red-500/15 text-red-300 animate-pulse' : ''}
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

      {/* compass */}
      <div className="mt-auto mb-4 flex flex-col items-center gap-1 text-white/20">
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
