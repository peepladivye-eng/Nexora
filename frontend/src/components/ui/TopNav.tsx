/**
 * ORBITGUARD – TopNav
 * Logo, tabs (Live View / Debris Tracking / Risk Analysis / Missions /
 * About), search with live results, IST clock. Tabs open the matching
 * side panel so every element is clickable.
 */
import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useOrbitGuard } from '../../store/orbitGuard';
import { MAJOR_SATELLITES } from '../../data/satellites';
import { PLANETS } from '../../data/planets';
import { focusSatelliteFromUI, focusPlanetFromUI } from './searchActions';

const NAV_TABS = [
  { id: 'objects',   label: 'Live View' },
  { id: 'scenarios', label: 'Debris Tracking' },
  { id: 'analytics', label: 'Risk Analysis' },
  { id: 'settings',  label: 'Missions' },
  { id: 'about',     label: 'About' },
] as const;

function toIST(d: Date): Date {
  const utcMs = d.getTime() + d.getTimezoneOffset() * 60_000;
  return new Date(utcMs + 5.5 * 3600_000);
}

function formatISTDate(d: Date): string {
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const p = (n: number) => String(n).padStart(2, '0');
  return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()} / ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())} IST`;
}

interface Hit {
  kind: 'sat' | 'planet';
  id: string;
  name: string;
  sub: string;
}

export default function TopNav() {
  const activePanel = useOrbitGuard((s) => s.activePanel);
  const openPanel = useOrbitGuard((s) => s.openPanel);
  const activeScenario = useOrbitGuard((s) => s.activeScenario);
  const [search, setSearch] = useState('');
  const [focused, setFocused] = useState(false);
  const [now, setNow] = useState<Date>(() => toIST(new Date()));

  useEffect(() => {
    const id = setInterval(() => setNow(toIST(new Date())), 1000);
    return () => clearInterval(id);
  }, []);

  const hits = useMemo<Hit[]>(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [];
    const sats: Hit[] = MAJOR_SATELLITES
      .filter(s => s.name.toLowerCase().includes(q) || s.noradId.includes(q))
      .map(s => ({ kind: 'sat', id: s.id, name: s.name, sub: `NORAD ${s.noradId} · ${s.altitudeKm} km` }));
    const planets: Hit[] = PLANETS
      .filter(p => p.name.toLowerCase().includes(q))
      .map(p => ({ kind: 'planet', id: p.id, name: p.name, sub: `${p.description.distanceFromSun} from Sun` }));
    return [...sats, ...planets].slice(0, 8);
  }, [search]);

  return (
    <nav className="glass fixed top-0 z-30 w-full h-14 flex items-center justify-between px-6 !rounded-none">
      <button
        className="flex items-center gap-3 group"
        onClick={() => openPanel(null)}
        title="ORBITGUARD home"
      >
        <div className="w-8 h-8 rounded-full bg-blue-500/80 flex items-center justify-center shadow-[0_0_16px_rgba(59,130,246,0.55)] group-hover:shadow-[0_0_22px_rgba(59,130,246,0.8)] transition-shadow">
          <span className="text-white text-lg leading-none">◉</span>
        </div>
        <div className="flex flex-col leading-tight text-left">
          <span className="font-bold text-white tracking-[0.18em] text-sm">ORBITGUARD</span>
          <span className="text-[10px] text-white/50 tracking-[0.24em]">TRACK · PREDICT · PROTECT</span>
        </div>
      </button>

      <div className="flex items-center gap-1">
        {NAV_TABS.map((tab) => {
          const isActive = activePanel === tab.id;
          return (
            <button
              key={tab.label}
              onClick={() => openPanel(tab.id)}
              className={`px-4 py-2 text-sm text-white/70 hover:text-white transition-colors ${
                isActive ? 'nav-underline text-white' : ''
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-4">
        <div className="relative">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setTimeout(() => setFocused(false), 150)}
            placeholder="Search satellite, debris, or NORAD ID..."
            className="glass-sm rounded-full w-72 h-9 pl-10 pr-4 text-sm text-white/90 placeholder:text-white/40 outline-none focus:border-sky-400/50 transition-colors"
          />
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/50 text-sm">🔍</span>

          <AnimatePresence>
            {focused && hits.length > 0 && (
              <motion.div
                className="absolute top-11 left-0 w-full glass p-1.5 space-y-0.5"
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
              >
                {hits.map(h => (
                  <button
                    key={`${h.kind}:${h.id}`}
                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-white/10 transition-colors flex items-center justify-between"
                    onMouseDown={() => {
                      if (h.kind === 'sat') focusSatelliteFromUI(h.id);
                      else focusPlanetFromUI(h.id);
                      setSearch('');
                    }}
                  >
                    <span className="text-xs text-white/85">{h.name}</span>
                    <span className="text-[10px] text-white/35">{h.sub}</span>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="text-xs text-white/70 font-mono tabular-nums tracking-wide">
          {formatISTDate(now)}
        </div>
      </div>
    </nav>
  );
}
