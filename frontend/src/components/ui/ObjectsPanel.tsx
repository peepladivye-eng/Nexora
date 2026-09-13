/**
 * ORBITGUARD – ObjectsPanel
 * The catalog: every named tracked object in one place. Click one and
 * the camera flies to it in the 3D scene and the intelligence panel
 * opens. Also lists planets.
 */
import { motion, AnimatePresence } from 'framer-motion';
import { useOrbitGuard, SelectedSatInfo, RiskLevel } from '../../store/orbitGuard';
import { MAJOR_SATELLITES } from '../../data/satellites';
import { PLANETS } from '../../data/planets';
import { SAT_COLORS } from '../objects/MajorSatellites';

function toSatInfo(s: typeof MAJOR_SATELLITES[number]): SelectedSatInfo {
  return {
    id: s.id,
    name: s.name,
    noradId: s.noradId,
    operator: s.operator,
    risk: s.risk as RiskLevel,
    isDebris: s.isDebris,
    altitudeKm: s.altitudeKm,
    velocityKmS: s.velocityKmS,
    inclinationDeg: s.inclinationDeg,
    orbitalPeriodMin: s.orbitalPeriodMin,
  };
}

export default function ObjectsPanel() {
  const activePanel = useOrbitGuard((s) => s.activePanel);
  const focusSatellite = useOrbitGuard((s) => s.focusSatellite);
  const focusPlanet = useOrbitGuard((s) => s.focusPlanet);
  const selectedSatellite = useOrbitGuard((s) => s.selectedSatellite);
  const selectedPlanet = useOrbitGuard((s) => s.selectedPlanet);

  if (activePanel !== 'objects') return null;

  return (
    <motion.aside
      className="pointer-events-auto glass fixed left-20 top-20 w-80 max-h-[70vh] overflow-y-auto p-4 z-50"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ type: 'spring', stiffness: 280, damping: 28 }}
    >
      <h2 className="text-sm font-bold text-white/80 uppercase tracking-widest mb-1">
        🛰 Tracked Objects
      </h2>
      <p className="text-[11px] text-white/40 mb-3">
        Click any object to fly to it. Planets and satellites are listed.
      </p>

          {/* planets */}
          <div className="text-[10px] text-white/30 uppercase tracking-widest mb-1.5">Planets</div>
          <div className="grid grid-cols-2 gap-1.5 mb-4">
            {PLANETS.map((p) => (
              <motion.button
                key={p.id}
                onClick={() => focusPlanet(p.id)}
                className={`text-left rounded-lg px-2.5 py-1.5 border text-xs transition-all
                  ${selectedPlanet === p.id
                    ? 'bg-sky-500/15 border-sky-400/40 text-sky-300'
                    : 'bg-white/[0.03] border-white/8 text-white/70 hover:bg-white/[0.07] hover:border-white/20'}`}
                whileTap={{ scale: 0.97 }}
              >
                {p.name}
              </motion.button>
            ))}
          </div>

          {/* satellites */}
          <div className="text-[10px] text-white/30 uppercase tracking-widest mb-1.5">
            Earth Orbit — Named Objects
          </div>
          <div className="space-y-1.5">
            {MAJOR_SATELLITES.map((s) => {
              const active = selectedSatellite === s.id;
              const color = SAT_COLORS[s.risk] ?? '#94a3b8';
              return (
                <motion.button
                  key={s.id}
                  onClick={() => focusSatellite(s.id, toSatInfo(s))}
                  className={`w-full text-left rounded-lg px-3 py-2 border flex items-center gap-2.5 transition-all
                    ${active
                      ? 'bg-sky-500/15 border-sky-400/40'
                      : 'bg-white/[0.03] border-white/8 hover:bg-white/[0.07] hover:border-white/20'}`}
                  whileHover={{ x: 2 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: color, boxShadow: `0 0 8px ${color}` }}
                  />
                  <span className="flex-1 min-w-0">
                    <span className="block text-xs text-white/85 truncate">{s.name}</span>
                    <span className="block text-[10px] text-white/35">
                      NORAD {s.noradId} · {s.altitudeKm} km · {s.isDebris ? 'Debris' : s.operator}
                    </span>
                  </span>
                  {s.risk === 'CRITICAL' && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-red-500/20 text-red-300 border border-red-400/40 font-bold">
                      CRITICAL
                    </span>
                  )}
                </motion.button>
              );
            })}
          </div>
    </motion.aside>
  );
}
