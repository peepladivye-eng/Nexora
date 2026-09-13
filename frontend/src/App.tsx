/**
 * NEXORA – Orbital Collision Avoidance System
 * Main Application
 */

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import api, { ConjunctionEvent } from './services/api';
import GlassPanel from './components/GlassPanel';
import ConjunctionCard from './components/ConjunctionCard';
import RiskBadge from './components/RiskBadge';
import StatCounter from './components/StatCounter';
import ManeuverPanel from './components/ManeuverPanel';
import GlobeView from './components/GlobeView';
import RiskScoreBar from './components/RiskScoreBar';
import TcaCountdown from './components/TcaCountdown';
import './App.css';

/* ─── helpers ───────────────────────────────────────────── */

// Known NORAD IDs → friendly names
const KNOWN_NAMES: Record<string, string> = {
  '22675': 'COSMOS 2251',
  '33757': 'COSMOS 2251 DEB',
  '33758': 'COSMOS 2251 DEB',
  '33760': 'COSMOS 2251 DEB',
  '33761': 'COSMOS 2251 DEB',
  '33762': 'COSMOS 2251 DEB',
  '33764': 'COSMOS 2251 DEB',
  '33765': 'COSMOS 2251 DEB',
  '33766': 'COSMOS 2251 DEB',
  '33768': 'COSMOS 2251 DEB',
  '33779': 'COSMOS 2251 DEB',
  '33782': 'COSMOS 2251 DEB',
  '33785': 'COSMOS 2251 DEB',
  '33789': 'COSMOS 2251 DEB',
  '33791': 'COSMOS 2251 DEB',
  '33792': 'COSMOS 2251 DEB',
  '33793': 'COSMOS 2251 DEB',
  '33795': 'COSMOS 2251 DEB',
  '33797': 'COSMOS 2251 DEB',
  '33798': 'COSMOS 2251 DEB',
  '33818': 'COSMOS 2251 DEB',
  '33821': 'COSMOS 2251 DEB',
  '33836': 'COSMOS 2251 DEB',
  '44714': 'STARLINK-1008',
  '44718': 'STARLINK-1012',
  '44723': 'STARLINK-1017',
  '44725': 'STARLINK-1019',
  '44741': 'STARLINK-1035',
  '44744': 'STARLINK-1038',
  '44747': 'STARLINK-1041',
  '44748': 'STARLINK-1042',
  '44751': 'STARLINK-1045',
  '44752': 'STARLINK-1046',
  '44753': 'STARLINK-1047',
  '44768': 'STARLINK-1062',
  '44772': 'STARLINK-1066',
  '45044': 'STARLINK-1315',
  '45047': 'STARLINK-1318',
  '45061': 'STARLINK-1332',
};

const satName = (norad: string) => KNOWN_NAMES[norad] ?? `SAT-${norad}`;

const conjId = (ev: ConjunctionEvent) =>
  `${ev.norad_id_primary}_${ev.norad_id_secondary}`;

/* ─── App ────────────────────────────────────────────────── */

export default function App() {
  const [conjunctions, setConjunctions] = useState<ConjunctionEvent[]>([]);
  const [selected, setSelected]         = useState<ConjunctionEvent | null>(null);
  const [loading, setLoading]           = useState(true);
  const [refreshing, setRefreshing]     = useState(false);
  const [stats, setStats]               = useState({ total_events: 0, CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 });
  const [bootDone, setBootDone]         = useState(false);
  const [lastUpdated, setLastUpdated]   = useState<string | null>(null);
  const [scenario, setScenario]         = useState<string>('');  // '' = live data
  const detailRef                       = useRef<HTMLDivElement>(null);

  /* ── boot sequence ── */
  useEffect(() => {
    const t = setTimeout(() => setBootDone(true), 1600);
    return () => clearTimeout(t);
  }, []);

  /* ── fetch data ── */
  const fetchData = async (showRefreshing = false) => {
    try {
      if (showRefreshing) setRefreshing(true);
      else setLoading(true);
      setSelected(null);
      const res = await api.getConjunctions(undefined, 100, scenario || undefined);
      setConjunctions(res.events);
      setStats({ total_events: res.total_events, ...res.risk_summary });
      setLastUpdated(res.last_updated ?? new Date().toISOString());
    } catch (e) {
      console.error('fetch failed', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (!bootDone) return;
    fetchData();
  }, [bootDone, scenario]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── scroll detail into view on small screens ── */
  useEffect(() => {
    if (selected && detailRef.current) {
      detailRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [selected]);

  /* ── boot screen ── */
  if (!bootDone) {
    return (
      <div className="fixed inset-0 bg-black flex flex-col items-center justify-center gap-6">
        <motion.h1
          className="text-7xl font-black tracking-tight bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, type: 'spring', stiffness: 180 }}
        >
          NEXORA
        </motion.h1>

        <motion.p
          className="text-gray-400 text-lg"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.45 }}
        >
          Orbital Collision Avoidance System
        </motion.p>

        {/* animated orbit ring */}
        <motion.div
          className="w-24 h-24 rounded-full border-2 border-blue-500/40"
          style={{ borderTopColor: '#60a5fa' }}
          animate={{ rotate: 360 }}
          transition={{ duration: 1.4, repeat: Infinity, ease: 'linear' }}
        />

        <motion.div
          className="text-xs text-gray-600 tracking-widest uppercase"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 0.8, 0] }}
          transition={{ delay: 0.8, duration: 1.6, repeat: Infinity }}
        >
          Initialising orbital tracking…
        </motion.div>
      </div>
    );
  }

  /* ── main layout ── */
  return (
    <div className="min-h-screen bg-[#080c14] text-white overflow-x-hidden">

      {/* ── header ── */}
      <motion.header
        className="fixed top-0 left-0 right-0 z-50 glass-header px-6 py-3"
        initial={{ y: -80 }}
        animate={{ y: 0 }}
        transition={{ type: 'spring', stiffness: 220, damping: 28 }}
      >
        <div className="max-w-screen-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl font-black bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
              NEXORA
            </span>
            <span className="text-xs text-gray-500 hidden sm:inline">Collision Avoidance</span>
          </div>

          <div className="flex items-center gap-6 text-sm">
            {/* live pulse dot */}
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <span className="text-gray-400 text-xs">{scenario ? 'DEMO' : 'LIVE'}</span>
            </div>

            {/* Demo scenario switcher */}
            <select
              value={scenario}
              onChange={e => setScenario(e.target.value)}
              className="text-xs bg-white/5 border border-white/10 rounded-lg px-2 py-1
                text-gray-300 hover:border-white/30 cursor-pointer"
            >
              <option value="">🛰 Live Data</option>
              <option value="critical_alert">🚨 Critical Alert</option>
              <option value="high_activity">⚡ High Activity</option>
              <option value="default">📊 Typical Ops</option>
              <option value="educational">🎓 Educational</option>
              <option value="quiet_ops">✅ Quiet Ops</option>
            </select>

            <div>
              <span className="text-gray-500 mr-1">Tracking</span>
              <span className="font-bold text-lg"><StatCounter value={stats.total_events} /></span>
              <span className="text-gray-500 ml-1">objects</span>
            </div>

            {stats.CRITICAL > 0 && (
              <div className="flex items-center gap-2">
                <RiskBadge level="CRITICAL" showPulse size="sm" />
                <span className="font-bold"><StatCounter value={stats.CRITICAL} /></span>
              </div>
            )}

            {lastUpdated && (
              <span className="text-gray-600 text-xs hidden lg:inline">
                Updated {new Date(lastUpdated).toLocaleTimeString()}
              </span>
            )}
          </div>
        </div>
      </motion.header>

      {/* ── three-column grid ── */}
      <div className="pt-20 p-4 max-w-screen-2xl mx-auto grid grid-cols-1 lg:grid-cols-[340px_1fr_380px] gap-4 min-h-[calc(100vh-80px)]">

        {/* ── LEFT: conjunction list ── */}
        <motion.aside
          className="flex flex-col gap-3 overflow-y-auto max-h-[calc(100vh-90px)] pr-1"
          initial={{ x: -60, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.1, type: 'spring', stiffness: 200, damping: 28 }}
        >
          {/* risk summary bar */}
          <GlassPanel className="p-4" initial={false}>
            <div className="flex items-center justify-between mb-3">
              <span className="font-semibold text-sm">Conjunction Events</span>
              <div className="flex items-center gap-2">
                {lastUpdated && (
                  <span className="text-[10px] text-gray-600 hidden sm:inline">
                    {new Date(lastUpdated).toLocaleTimeString()}
                  </span>
                )}
                <motion.button
                  onClick={() => fetchData(true)}
                  disabled={refreshing || loading}
                  className="text-[10px] px-2 py-1 rounded-lg border border-white/10
                    text-gray-400 hover:border-white/30 hover:text-white
                    disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
                  whileTap={{ scale: 0.95 }}
                  title="Refresh conjunction data"
                >
                  <motion.span
                    animate={refreshing ? { rotate: 360 } : {}}
                    transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                  >
                    ↻
                  </motion.span>
                  {refreshing ? 'Refreshing…' : 'Refresh'}
                </motion.button>
              </div>
            </div>
            <div className="grid grid-cols-4 gap-1 text-center text-xs">
              {([
                ['CRITICAL', stats.CRITICAL, 'text-red-400'],
                ['HIGH',     stats.HIGH,     'text-amber-400'],
                ['MEDIUM',   stats.MEDIUM,   'text-yellow-400'],
                ['LOW',      stats.LOW,      'text-green-400'],
              ] as [string, number, string][]).map(([label, val, color]) => (
                <div key={label} className="glass rounded-lg py-2">
                  <div className="text-gray-500">{label}</div>
                  <div className={`font-bold text-base ${color}`}>
                    <StatCounter value={val} />
                  </div>
                </div>
              ))}
            </div>
          </GlassPanel>

          {/* list */}
          {loading ? (
            <GlassPanel className="p-10 text-center" initial={false}>
              <motion.div
                className="w-8 h-8 rounded-full border-2 border-blue-400 border-t-transparent mx-auto"
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              />
              <p className="text-gray-500 text-xs mt-4">Running conjunction assessment…</p>
            </GlassPanel>
          ) : (
            <motion.div
              className="space-y-2"
              variants={{ show: { transition: { staggerChildren: 0.04 } } }}
              initial="hidden"
              animate="show"
            >
              {conjunctions.map(ev => (
                <motion.div
                  key={conjId(ev)}
                  variants={{ hidden: { opacity: 0, x: -16 }, show: { opacity: 1, x: 0 } }}
                >
                  <ConjunctionCard
                    event={ev}
                    onSelect={setSelected}
                    isSelected={
                      selected?.norad_id_primary   === ev.norad_id_primary &&
                      selected?.norad_id_secondary === ev.norad_id_secondary
                    }
                  />
                </motion.div>
              ))}
            </motion.div>
          )}
        </motion.aside>

        {/* ── CENTRE: globe ── */}
        <motion.div
          className="rounded-2xl overflow-hidden bg-black relative"
          style={{ minHeight: 520 }}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.25, type: 'spring', stiffness: 160, damping: 24 }}
        >
          <GlobeView
            conjunctions={conjunctions}
            selected={selected}
            onSelect={setSelected}
          />

          {/* overlay label */}
          <div className="absolute top-3 left-4 text-xs text-gray-500 pointer-events-none">
            🌍 Real-time LEO tracking · {conjunctions.length} active conjunctions
          </div>
        </motion.div>

        {/* ── RIGHT: event detail + maneuver ── */}
        <motion.div
          ref={detailRef}
          className="overflow-y-auto max-h-[calc(100vh-90px)] pr-1"
          initial={{ x: 60, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.35, type: 'spring', stiffness: 200, damping: 28 }}
        >
          <AnimatePresence mode="wait">
            {selected ? (
              <motion.div
                key={conjId(selected)}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                transition={{ type: 'spring', stiffness: 280, damping: 28 }}
              >
                <GlassPanel className="p-5" initial={false}>

                  {/* header row */}
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h2 className="font-bold text-base leading-tight">
                        {satName(selected.norad_id_primary)}
                      </h2>
                      <p className="text-gray-500 text-xs">
                        vs {satName(selected.norad_id_secondary)}
                      </p>
                    </div>
                    <RiskBadge
                      level={selected.risk_level}
                      showPulse={selected.risk_level === 'CRITICAL'}
                    />
                  </div>

                  {/* NORAD IDs */}
                  <div className="grid grid-cols-2 gap-2 mb-4 text-xs">
                    <div className="glass rounded-lg p-2">
                      <div className="text-gray-500">Primary NORAD</div>
                      <div className="font-mono font-bold">{selected.norad_id_primary}</div>
                    </div>
                    <div className="glass rounded-lg p-2">
                      <div className="text-gray-500">Secondary NORAD</div>
                      <div className="font-mono font-bold">{selected.norad_id_secondary}</div>
                    </div>
                  </div>

                  {/* big numbers */}
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="glass rounded-xl p-3">
                      <div className="text-xs text-gray-500 mb-1">Miss Distance</div>
                      <div className="text-2xl font-black">
                        {selected.miss_distance_km.toFixed(2)}
                        <span className="text-sm text-gray-400 ml-1">km</span>
                      </div>
                    </div>
                    <div className="glass rounded-xl p-3">
                      <div className="text-xs text-gray-500 mb-1">Rel. Velocity</div>
                      <div className="text-2xl font-black">
                        {selected.relative_velocity_km_s.toFixed(1)}
                        <span className="text-sm text-gray-400 ml-1">km/s</span>
                      </div>
                    </div>
                  </div>

                  {/* Pc dual method */}
                  <div className="glass rounded-xl p-3 mb-4 text-xs space-y-2">
                    <div className="text-gray-400 font-semibold uppercase tracking-wider mb-1">
                      Collision Probability
                    </div>
                    {[
                      ['Foster Method', selected.pc_foster],
                      ['Chan Method',   selected.pc_chan],
                    ].map(([label, val]) => (
                      <div key={label as string} className="flex justify-between items-center">
                        <span className="text-gray-400">{label as string}</span>
                        <span className="font-mono font-bold text-sm">
                          {(val as number).toExponential(2)}
                        </span>
                      </div>
                    ))}
                    <div className="pt-1 border-t border-white/5 text-gray-600 text-[10px]">
                      Debris uncertainty calibration: ×2.0 applied
                    </div>
                  </div>

                  {/* Explainable Risk Score */}
                  {selected.risk_score !== undefined && (
                    <div className="mb-4">
                      <RiskScoreBar
                        riskScore={selected.risk_score}
                        riskCategory={selected.risk_category ?? selected.risk_level}
                        distanceScore={selected.distance_score ?? 0}
                        velocityScore={selected.velocity_score ?? 0}
                        urgencyScore={selected.urgency_score ?? 0}
                      />
                    </div>
                  )}

                  {/* TCA live countdown */}
                  <TcaCountdown
                    tcaIso={selected.tca}
                    riskLevel={selected.risk_level}
                  />

                  {/* demo badge */}
                  {(selected as any).is_demo && (
                    <div className="mb-3 text-[10px] text-gray-600 border border-white/5 rounded px-2 py-1">
                      ⓘ Demo scenario — illustrative values based on real orbital geometry
                    </div>
                  )}

                  {/* ── Maneuver panel ── */}
                  <ManeuverPanel
                    conjunctionId={conjId(selected)}
                    originalPc={selected.pc_foster}
                    originalMiss={selected.miss_distance_km}
                  />

                </GlassPanel>
              </motion.div>
            ) : (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="h-full flex items-center justify-center"
              >
                <div className="glass rounded-2xl p-10 text-center">
                  <div className="text-4xl mb-4">🛰️</div>
                  <p className="text-gray-300 font-semibold">Select an event</p>
                  <p className="text-gray-500 text-xs mt-2">
                    Click any conjunction in the list
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

      </div>
    </div>
  );
}
