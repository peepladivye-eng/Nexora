/**
 * NEXORA - Orbital Collision Avoidance System
 * Main Application Component
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import api, { ConjunctionEvent } from './services/api';
import GlassPanel from './components/GlassPanel';
import ConjunctionCard from './components/ConjunctionCard';
import RiskBadge from './components/RiskBadge';
import StatCounter from './components/StatCounter';
import './App.css';

function App() {
  const [conjunctions, setConjunctions] = useState<ConjunctionEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<ConjunctionEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total_events: 0,
    CRITICAL: 0,
    HIGH: 0,
    MEDIUM: 0,
    LOW: 0
  });
  const [bootComplete, setBootComplete] = useState(false);

  // Boot sequence
  useEffect(() => {
    const bootTimer = setTimeout(() => {
      setBootComplete(true);
    }, 1500);
    
    return () => clearTimeout(bootTimer);
  }, []);

  // Fetch conjunctions on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await api.getConjunctions(undefined, 50);
        setConjunctions(response.events);
        setStats({
          total_events: response.total_events,
          ...response.risk_summary
        });
      } catch (error) {
        console.error('Failed to fetch conjunctions:', error);
      } finally {
        setLoading(false);
      }
    };

    if (bootComplete) {
      fetchData();
    }
  }, [bootComplete]);

  const handleSelectEvent = (event: ConjunctionEvent) => {
    setSelectedEvent(event);
  };

  if (!bootComplete) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, type: 'spring' }}
          className="text-center"
        >
          <motion.h1 
            className="text-7xl font-bold mb-4 bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 bg-clip-text text-transparent"
            animate={{ 
              backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
            }}
            transition={{ duration: 3, repeat: Infinity }}
          >
            NEXORA
          </motion.h1>
          <motion.p 
            className="text-xl text-gray-400"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            Orbital Collision Avoidance System
          </motion.p>
          <motion.div
            className="mt-8 text-sm text-gray-500"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 0] }}
            transition={{ delay: 1, duration: 2, repeat: Infinity }}
          >
            Initializing orbital tracking...
          </motion.div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white">
      {/* Header */}
      <motion.header 
        className="fixed top-0 left-0 right-0 z-50 glass-header p-4"
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 30 }}
      >
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-4">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
              NEXORA
            </h1>
            <span className="text-sm text-gray-400">Collision Avoidance</span>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="text-sm">
              <div className="text-gray-400">Tracking</div>
              <div className="text-xl font-bold">
                <StatCounter value={stats.total_events} />
              </div>
            </div>
            {stats.CRITICAL > 0 && (
              <div className="flex items-center gap-2">
                <RiskBadge level="CRITICAL" showPulse size="sm" />
                <span className="text-sm">
                  <StatCounter value={stats.CRITICAL} />
                </span>
              </div>
            )}
          </div>
        </div>
      </motion.header>

      {/* Main content */}
      <div className="pt-24 px-4 pb-4">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-4">
          
          {/* Left sidebar - Conjunction list */}
          <motion.div
            className="lg:col-span-1 space-y-3 max-h-[calc(100vh-120px)] overflow-y-auto"
            initial={{ x: -100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
          >
            <GlassPanel className="p-4">
              <h2 className="text-lg font-semibold mb-3">Conjunction Events</h2>
              <div className="grid grid-cols-4 gap-2 text-xs mb-4">
                <div className="text-center">
                  <div className="text-gray-400">Critical</div>
                  <div className="text-risk-critical font-bold">
                    <StatCounter value={stats.CRITICAL} />
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-gray-400">High</div>
                  <div className="text-risk-high font-bold">
                    <StatCounter value={stats.HIGH} />
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-gray-400">Medium</div>
                  <div className="text-risk-medium font-bold">
                    <StatCounter value={stats.MEDIUM} />
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-gray-400">Low</div>
                  <div className="text-risk-low font-bold">
                    <StatCounter value={stats.LOW} />
                  </div>
                </div>
              </div>
            </GlassPanel>

            {loading ? (
              <GlassPanel className="p-8 text-center">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                  className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto"
                />
                <p className="text-sm text-gray-400 mt-4">Loading conjunction data...</p>
              </GlassPanel>
            ) : conjunctions.length === 0 ? (
              <GlassPanel className="p-8 text-center">
                <p className="text-gray-400">No conjunction events detected</p>
                <p className="text-sm text-gray-500 mt-2">
                  All satellites operating within safe parameters
                </p>
              </GlassPanel>
            ) : (
              <motion.div 
                className="space-y-2"
                variants={{
                  show: {
                    transition: {
                      staggerChildren: 0.05
                    }
                  }
                }}
                initial="hidden"
                animate="show"
              >
                {conjunctions.map((event) => (
                  <motion.div
                    key={`${event.norad_id_primary}_${event.norad_id_secondary}`}
                    variants={{
                      hidden: { opacity: 0, x: -20 },
                      show: { opacity: 1, x: 0 }
                    }}
                  >
                    <ConjunctionCard
                      event={event}
                      onSelect={handleSelectEvent}
                      isSelected={
                        selectedEvent?.norad_id_primary === event.norad_id_primary &&
                        selectedEvent?.norad_id_secondary === event.norad_id_secondary
                      }
                    />
                  </motion.div>
                ))}
              </motion.div>
            )}
          </motion.div>

          {/* Center - Globe visualization placeholder */}
          <motion.div
            className="lg:col-span-1"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.4, type: 'spring', stiffness: 200 }}
          >
            <GlassPanel className="p-8 h-[600px] flex items-center justify-center">
              <div className="text-center">
                <div className="w-32 h-32 mx-auto mb-6 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 animate-pulse" />
                <p className="text-xl font-semibold mb-2">3D Globe View</p>
                <p className="text-sm text-gray-400">
                  react-globe.gl visualization<br />
                  Coming in next phase
                </p>
              </div>
            </GlassPanel>
          </motion.div>

          {/* Right sidebar - Event details */}
          <motion.div
            className="lg:col-span-1"
            initial={{ x: 100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.6, type: 'spring', stiffness: 200 }}
          >
            <AnimatePresence mode="wait">
              {selectedEvent ? (
                <GlassPanel 
                  key="selected"
                  className="p-6"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                >
                  <div className="flex items-start justify-between mb-4">
                    <h2 className="text-xl font-semibold">Event Details</h2>
                    <RiskBadge 
                      level={selectedEvent.risk_level}
                      showPulse={selectedEvent.risk_level === 'CRITICAL'}
                    />
                  </div>

                  <div className="space-y-4">
                    <div>
                      <div className="text-sm text-gray-400">Primary Object</div>
                      <div className="text-lg font-mono">{selectedEvent.norad_id_primary}</div>
                    </div>

                    <div>
                      <div className="text-sm text-gray-400">Secondary Object</div>
                      <div className="text-lg font-mono">{selectedEvent.norad_id_secondary}</div>
                    </div>

                    <div className="border-t border-white/10 pt-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <div className="text-sm text-gray-400">Miss Distance</div>
                          <div className="text-2xl font-bold">
                            {selectedEvent.miss_distance_km.toFixed(2)}
                            <span className="text-sm text-gray-400 ml-1">km</span>
                          </div>
                        </div>
                        <div>
                          <div className="text-sm text-gray-400">Rel. Velocity</div>
                          <div className="text-2xl font-bold">
                            {selectedEvent.relative_velocity_km_s.toFixed(1)}
                            <span className="text-sm text-gray-400 ml-1">km/s</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div>
                      <div className="text-sm text-gray-400 mb-2">Collision Probability</div>
                      <div className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-400">Foster Method:</span>
                          <span className="font-mono">{selectedEvent.pc_foster.toExponential(2)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-400">Chan Method:</span>
                          <span className="font-mono">{selectedEvent.pc_chan.toExponential(2)}</span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <div className="text-sm text-gray-400">Time of Closest Approach</div>
                      <div className="text-sm font-mono mt-1">
                        {new Date(selectedEvent.tca).toLocaleString()}
                      </div>
                    </div>

                    <motion.button
                      className="w-full mt-6 px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg font-semibold"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => alert('Maneuver computation coming in next phase!')}
                    >
                      Compute Avoidance Maneuver
                    </motion.button>
                  </div>
                </GlassPanel>
              ) : (
                <GlassPanel 
                  key="empty"
                  className="p-8 text-center h-full flex items-center justify-center"
                >
                  <div>
                    <p className="text-gray-400">Select a conjunction event</p>
                    <p className="text-sm text-gray-500 mt-2">
                      Click on an event in the list to view details
                    </p>
                  </div>
                </GlassPanel>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

export default App;
