/**
 * ORBITGUARD — Mission Control UI
 * 3D-first app: full-screen solar system canvas, HTML overlay for UI.
 * Progressive disclosure: panels appear only when triggered.
 */

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';

import Stars         from './components/scene/Stars';
import Nebula        from './components/scene/Nebula';
import Sun           from './components/scene/Sun';
import AllPlanets    from './components/planets/AllPlanets';
import EarthSystem   from './components/objects/EarthSystem';
import ConjunctionScene from './components/objects/ConjunctionScene';
import CameraDirector from './components/controls/CameraDirector';

import TopNav            from './components/ui/TopNav';
import PlanetInfoCard    from './components/ui/PlanetInfoCard';
import StatsPanel        from './components/ui/StatsPanel';
import SideNav           from './components/ui/SideNav';
import BottomToolbar     from './components/ui/BottomToolbar';
import ZoomControls      from './components/ui/ZoomControls';
import IntelligencePanel from './components/ui/IntelligencePanel';
import ConjunctionAlert  from './components/ui/ConjunctionAlert';
import ObjectsPanel      from './components/ui/ObjectsPanel';
import ScenariosPanel    from './components/ui/ScenariosPanel';
import AnalyticsPanel    from './components/ui/AnalyticsPanel';
import SettingsPanel     from './components/ui/SettingsPanel';
import AboutPanel        from './components/ui/AboutPanel';
import { useOrbitGuard } from './store/orbitGuard';
import './App.css';

/* ── boot screen ── */
function BootScreen() {
  return (
    <div className="fixed inset-0 bg-[#02050d] flex flex-col items-center justify-center gap-8 overflow-hidden">
      <div className="absolute inset-0">
        {Array.from({ length: 120 }).map((_, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full bg-white"
            style={{
              left: `${Math.random() * 100}%`,
              top:  `${Math.random() * 100}%`,
              width:  `${1 + Math.random() * 2}px`,
              height: `${1 + Math.random() * 2}px`,
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.4 + Math.random() * 0.6, 0] }}
            transition={{
              duration:    1.2 + Math.random() * 1.5,
              delay:       Math.random() * 1.2,
              repeat:      Infinity,
              repeatDelay: Math.random() * 2,
            }}
          />
        ))}
      </div>

      <motion.div
        className="relative"
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.8, type: 'spring', stiffness: 180 }}
      >
        <div className="absolute -inset-6 rounded-full bg-gradient-to-br from-cyan-500/30 via-blue-500/20 to-purple-500/20 blur-2xl animate-pulse" />
        <div className="relative w-24 h-24 flex items-center justify-center">
          <motion.div
            className="absolute inset-0 rounded-full border-2 border-cyan-400/40"
            animate={{ rotate: 360 }}
            transition={{ duration: 1.4, repeat: Infinity, ease: 'linear' }}
            style={{ borderTopColor: '#22d3ee' }}
          />
          <motion.div
            className="absolute inset-3 rounded-full border border-blue-400/30"
            animate={{ rotate: -360 }}
            transition={{ duration: 2.4, repeat: Infinity, ease: 'linear' }}
            style={{ borderRightColor: '#60a5fa' }}
          />
          <div className="relative w-10 h-10 rounded-full bg-gradient-to-br from-cyan-300 via-blue-500 to-purple-600 shadow-[0_0_30px_rgba(34,211,238,0.6)]" />
        </div>
      </motion.div>

      <div className="text-center relative z-10">
        <motion.h1
          className="text-6xl font-black tracking-[0.35em] bg-gradient-to-r from-cyan-200 via-blue-300 to-purple-300 bg-clip-text text-transparent"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.2, type: 'spring', stiffness: 160 }}
        >
          ORBITGUARD
        </motion.h1>
        <motion.p
          className="mt-3 text-sm text-gray-400 tracking-[0.4em] uppercase"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          Track · Predict · Protect
        </motion.p>
      </div>

      <motion.div
        className="text-[11px] text-gray-500 tracking-[0.3em] uppercase"
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 0.8, 0] }}
        transition={{ delay: 0.5, duration: 1.8, repeat: Infinity, repeatDelay: 0.2 }}
      >
        Initialising orbital tracking matrix…
      </motion.div>
    </div>
  );
}

/* ── main app ── */
export default function App() {
  const conjunctionMode = useOrbitGuard(s => s.conjunctionMode);
  const activeScenario = useOrbitGuard(s => s.activeScenario);
  const setStats = useOrbitGuard(s => s.setStats);
  const triggerAlert = useOrbitGuard(s => s.triggerAlert);
  const [bootDone, setBootDone] = useState(false);
  const [scenarioInitialized, setScenarioInitialized] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setBootDone(true), 2000);
    return () => clearTimeout(t);
  }, []);

  // Initialize the default scenario on mount
  useEffect(() => {
    if (!bootDone || scenarioInitialized) return;
    
    // Import scenario bridge functions
    import('./services/scenariosBridge').then(({ applyScenario, CONJUNCTIONS_BY_SCENARIO }) => {
      if (activeScenario) {
        console.log('🚀 Initializing scenario:', activeScenario);
        const applied = applyScenario(activeScenario, CONJUNCTIONS_BY_SCENARIO);
        setStats(applied.stats);
        if (applied.headline) {
          // Delay the alert trigger slightly so the UI loads first
          setTimeout(() => triggerAlert(applied.headline!), 500);
        }
        setScenarioInitialized(true);
      }
    });
  }, [bootDone, activeScenario, scenarioInitialized, setStats, triggerAlert]);

  if (!bootDone) return <BootScreen />;

  return (
    <div className="fixed inset-0 bg-[#02060f] overflow-hidden text-white">

      {/* 3D Canvas — full screen base layer */}
      <div className="absolute inset-0">
        <Canvas
          dpr={[1, 1.75]}
          camera={{ position: [45, 35, 70], fov: 48, near: 0.05, far: 2000 }}
          gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
          onCreated={({ gl }) => {
            gl.toneMapping   = 1;  // ACESFilmicToneMapping
            gl.toneMappingExposure = 1.05;
          }}
        >
          <color attach="background" args={['#02030a']} />
          <ambientLight intensity={0.05} />

          <Stars />
          <Nebula />
          <Sun position={[0, 0, 0]} />
          <AllPlanets />
          <EarthSystem />
          <ConjunctionScene />
          <CameraDirector />

          <OrbitControls
            makeDefault
            enableDamping
            dampingFactor={0.06}
            autoRotate
            autoRotateSpeed={0.3}
            minDistance={0.2}
            maxDistance={400}
          />

          <EffectComposer multisampling={0} enableNormalPass={false}>
            <Bloom
              intensity={0.65}
              luminanceThreshold={0.2}
              luminanceSmoothing={0.9}
              mipmapBlur
              radius={0.55}
            />
            <Vignette offset={0.3} darkness={0.6} />
          </EffectComposer>
        </Canvas>
      </div>

      {/* Conjunction alert — red pulsing vignette */}
      <AnimatePresence>
        {conjunctionMode && (
          <motion.div
            className="absolute inset-0 pointer-events-none z-[5]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              background:
                'radial-gradient(ellipse at center, transparent 50%, rgba(120,0,0,0.4) 100%)',
            }}
          >
            <motion.div
              className="absolute inset-0"
              animate={{ opacity: [0, 0.5, 0] }}
              transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
              style={{
                background:
                  'linear-gradient(180deg, rgba(239,68,68,0.08) 0%, transparent 30%, transparent 70%, rgba(239,68,68,0.08) 100%)',
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* HTML UI overlay — pointer-events disabled on container, re-enabled per child */}
      <div className="absolute inset-0 pointer-events-none z-10">
        <TopNav />
        <StatsPanel />
        <SideNav />
        <ZoomControls />
        <ConjunctionAlert />
        <IntelligencePanel />
        <PlanetInfoCard />
        <ObjectsPanel />
        <ScenariosPanel />
        <AnalyticsPanel />
        <SettingsPanel />
        <AboutPanel />
        <BottomToolbar />
      </div>
    </div>
  );
}
