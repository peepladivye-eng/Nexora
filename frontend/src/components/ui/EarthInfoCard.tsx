import { useState } from 'react';
import { PLANET_BY_ID } from '../../data/planets';
import { useOrbitGuard } from '../../store/orbitGuard';

interface InfoRowProps {
  label: string;
  value: string;
}

function InfoRow({ label, value }: InfoRowProps) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
      <span className="text-xs text-white/50 tracking-wide">{label}</span>
      <span className="text-sm text-white/90 font-medium tabular-nums">{value}</span>
    </div>
  );
}

function EarthInfoCard() {
  const earth = PLANET_BY_ID['earth'];
  const [visible, setVisible] = useState<boolean>(true);
  const setSelectedPlanet = useOrbitGuard((s) => s.setSelectedPlanet);

  if (!visible || !earth) return null;

  const debris = earth.description.debrisLeo;

  return (
    <aside className="glass fixed top-20 left-6 w-72 p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-2xl leading-none">🌍</span>
          <h2 className="text-lg font-semibold text-white tracking-wide">Earth</h2>
        </div>
        <button
          onClick={() => setVisible(false)}
          className="w-7 h-7 rounded-md flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-colors text-sm"
          aria-label="Close Earth info"
        >
          ✕
        </button>
      </div>

      <div className="flex flex-col">
        <InfoRow label="Distance from Sun" value={earth.description.distanceFromSun} />
        <InfoRow label="Orbital Period" value={earth.description.orbitalPeriod} />
        <InfoRow label="Radius" value={earth.description.radiusKm} />
        <InfoRow label="Moons" value={earth.description.moons.toString()} />
        <InfoRow
          label="Known Debris (LEO)"
          value={typeof debris === 'number' ? debris.toLocaleString() : '—'}
        />
      </div>

      <button
        onClick={() => setSelectedPlanet('earth')}
        className="mt-1 w-full py-2 rounded-md text-sm text-sky-300 bg-sky-500/10 hover:bg-sky-500/20 border border-sky-400/30 hover:border-sky-400/60 transition-colors flex items-center justify-center gap-1 group"
      >
        View Debris Around Earth
        <span className="group-hover:translate-x-0.5 transition-transform">→</span>
      </button>
    </aside>
  );
}

export default EarthInfoCard;
