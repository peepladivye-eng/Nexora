/**
 * ORBITGUARD – PlanetInfoCard
 * Appears top-left when a planet is selected. Shows planet facts and a
 * "View Debris Around Earth" fly-to for Earth.
 */
import { motion, AnimatePresence } from 'framer-motion';
import { PLANET_BY_ID } from '../../data/planets';
import { useOrbitGuard } from '../../store/orbitGuard';

const PLANET_EMOJI: Record<string, string> = {
  mercury: '🌑', venus: '🌕', earth: '🌍', mars: '🔴',
  jupiter: '🟠', saturn: '🪐', uranus: '🔵', neptune: '🔷',
};

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
      <span className="text-xs text-white/50 tracking-wide">{label}</span>
      <span className="text-sm text-white/90 font-medium tabular-nums">{value}</span>
    </div>
  );
}

export default function PlanetInfoCard() {
  const selectedPlanet = useOrbitGuard((s) => s.selectedPlanet);
  const focusEarthOrbit = useOrbitGuard((s) => s.focusEarthOrbit);
  const clearSelection = useOrbitGuard((s) => s.clearSelection);

  const planet = selectedPlanet ? PLANET_BY_ID[selectedPlanet] : null;

  return (
    <AnimatePresence>
      {planet && (
        <motion.aside
          key={planet.id}
          className="pointer-events-auto glass fixed top-20 left-6 w-72 p-4 flex flex-col gap-3"
          initial={{ opacity: 0, x: -24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -24 }}
          transition={{ type: 'spring', stiffness: 260, damping: 26 }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-2xl leading-none">{PLANET_EMOJI[planet.id] ?? '🪐'}</span>
              <h2 className="text-lg font-semibold text-white tracking-wide">{planet.name}</h2>
            </div>
            <button
              onClick={clearSelection}
              className="w-7 h-7 rounded-md flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-colors text-sm"
              aria-label="Close info"
            >
              ✕
            </button>
          </div>

          <div className="flex flex-col">
            <InfoRow label="Distance from Sun" value={planet.description.distanceFromSun} />
            <InfoRow label="Orbital Period" value={planet.description.orbitalPeriod} />
            <InfoRow label="Radius" value={planet.description.radiusKm} />
            <InfoRow label="Moons" value={planet.description.moons.toString()} />
            {typeof planet.description.debrisLeo === 'number' && (
              <InfoRow label="Known Debris (LEO)" value={planet.description.debrisLeo.toLocaleString()} />
            )}
          </div>

          {planet.id === 'earth' && (
            <button
              onClick={() => focusEarthOrbit(4.2)}
              className="mt-1 w-full py-2 rounded-md text-sm text-sky-300 bg-sky-500/10 hover:bg-sky-500/20 border border-sky-400/30 hover:border-sky-400/60 transition-colors flex items-center justify-center gap-1 group"
            >
              View Debris Around Earth
              <span className="group-hover:translate-x-0.5 transition-transform">→</span>
            </button>
          )}
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
