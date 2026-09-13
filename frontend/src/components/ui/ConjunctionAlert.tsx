/**
 * ORBITGUARD – ConjunctionAlert
 * Full-width critical alert banner with live countdown.
 * Shown when conjunctionMode is active (triggered from scenario pick or
 * conjunction row click).
 */
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useOrbitGuard } from '../../store/orbitGuard';
import { SAT_NAME_BY_ID } from '../../data/satellites';

function pad(n: number) { return String(n).padStart(2, '0'); }

function useCountdown(tcaIso: string | null) {
  const [delta, setDelta] = useState(0);
  useEffect(() => {
    if (!tcaIso) return;
    const tick = () => setDelta(Math.max(0, new Date(tcaIso).getTime() - Date.now()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [tcaIso]);
  const total = Math.floor(delta / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

export default function ConjunctionAlert() {
  const conjunctionMode = useOrbitGuard((s) => s.conjunctionMode);
  const selectedConjunction = useOrbitGuard((s) => s.selectedConjunction);
  const dismissAlert = useOrbitGuard((s) => s.dismissAlert);
  const countdown = useCountdown(selectedConjunction?.tcaIso ?? null);

  if (!selectedConjunction) return null;

  const name = (id: string) => SAT_NAME_BY_ID[id] ?? id;

  return (
    <AnimatePresence>
      {conjunctionMode && (
        <motion.div
          className="pointer-events-auto fixed top-14 left-[72px] right-0 z-20
            border-y border-red-500/40 bg-gradient-to-r
            from-red-950/70 via-red-900/50 to-transparent
            backdrop-blur-sm flex items-center justify-between px-6 py-2"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
        >
          <div className="flex items-center gap-4">
            <motion.div
              className="w-2.5 h-2.5 rounded-full bg-red-400"
              animate={{ scale: [1, 1.4, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
            />
            <div>
              <div className="text-xs text-red-300 font-bold tracking-widest uppercase">
                ⚠ Conjunction Alert — High Risk Collision Detected
              </div>
              <div className="text-[10px] text-red-400/70 mt-0.5">
                {name(selectedConjunction.primaryId)} ↔ {name(selectedConjunction.secondaryId)}
                &nbsp;·&nbsp;Miss {selectedConjunction.missDistanceKm < 1
                  ? `${(selectedConjunction.missDistanceKm * 1000).toFixed(0)} m`
                  : `${selectedConjunction.missDistanceKm.toFixed(2)} km`}
                {selectedConjunction.predictedMissKm != null && (
                  <>
                    &nbsp;→&nbsp;<span className="text-green-400">
                      {selectedConjunction.predictedMissKm < 1
                        ? `${Math.round(selectedConjunction.predictedMissKm * 1000)} m`
                        : `${selectedConjunction.predictedMissKm.toFixed(2)} km`} post-maneuver
                    </span>
                  </>
                )}
                &nbsp;·&nbsp;Confidence {Math.round(selectedConjunction.confidence * (selectedConjunction.confidence <= 1 ? 100 : 1))}%
              </div>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="text-center">
              <div className="text-[9px] text-red-400/60 uppercase tracking-widest">T−</div>
              <div className="text-xl font-black font-mono tabular-nums text-red-300">{countdown}</div>
            </div>
            <div className="px-3 py-1 rounded-md bg-red-500/20 border border-red-400/40
              text-xs font-bold text-red-300 uppercase tracking-wider">
              {selectedConjunction.risk}
            </div>
            <button
              onClick={dismissAlert}
              className="text-red-400/50 hover:text-red-200 text-lg ml-2 transition-colors"
              title="Dismiss alert"
            >
              ✕
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
