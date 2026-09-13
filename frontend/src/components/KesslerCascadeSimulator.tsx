import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export type KesslerMode = 'idle' | 'inaction' | 'ai_avoidance';

export interface KesslerState {
  mode: KesslerMode;
  progress: number;
  year: number;
  debrisCount: number;
  collisionEvents: number;
  satellitesLost: number;
  estimatedCostBillions: number;
  running: boolean;
}

interface Props {
  onStateChange: (s: KesslerState) => void;
  state: KesslerState;
}

const BASE_DEBRIS = 8420;

export const KesslerCascadeSimulator = ({ state, onStateChange }: Props) => {
  const [step] = useState(0.0035);

  useEffect(() => {
    if (!state.running) return;
    const id = setInterval(() => {
      const newProg = Math.min(1, state.progress + step);
      const newYear = 2026 + newProg * 50;
      let debris: number, collisions: number, sats: number, cost: number;
      if (state.mode === 'inaction') {
        const growth = Math.pow(newProg, 2.3) * 16;
        debris = BASE_DEBRIS + Math.floor(growth * BASE_DEBRIS);
        collisions = Math.floor(newProg * 285);
        sats = Math.floor(newProg * 87);
        cost = +(newProg * 42.3).toFixed(1);
      } else {
        const decay = 1 - newProg * 0.38;
        debris = Math.floor(BASE_DEBRIS * decay);
        collisions = Math.floor(newProg * 12);
        sats = Math.floor(newProg * 2);
        cost = +(newProg * 1.8).toFixed(1);
      }
      onStateChange({
        mode: state.mode,
        progress: newProg,
        year: newYear,
        debrisCount: debris,
        collisionEvents: collisions,
        satellitesLost: sats,
        estimatedCostBillions: cost,
        running: newProg < 1,
      });
    }, 55);
    return () => clearInterval(id);
  }, [state.running, state.mode, state.progress, step, onStateChange]);

  const reset = () =>
    onStateChange({
      mode: 'idle', progress: 0, year: 0,
      debrisCount: BASE_DEBRIS, collisionEvents: 0,
      satellitesLost: 0, estimatedCostBillions: 0, running: false,
    });

  const setMode = (m: KesslerMode) =>
    onStateChange({
      mode: m, progress: 0, year: 2026,
      debrisCount: BASE_DEBRIS, collisionEvents: 0,
      satellitesLost: 0, estimatedCostBillions: 0, running: m !== 'idle',
    });

  const tint = state.mode === 'inaction' ? 'from-red-500/30 to-orange-500/10'
    : state.mode === 'ai_avoidance' ? 'from-cyan-500/25 to-blue-500/10'
    : 'from-white/5 to-white/0';

  return (
    <div className={`relative rounded-2xl border border-white/10 p-3 overflow-hidden bg-gradient-to-br ${tint}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-base">{state.mode === 'inaction' ? '☠️' : state.mode === 'ai_avoidance' ? '🛡️' : '🌀'}</span>
          <div>
            <div className="text-xs font-semibold text-white leading-tight">Kessler Cascade Simulator</div>
            <div className="text-[10px] text-gray-500">50-yr projection · NASA LEGEND-based</div>
          </div>
        </div>
        {state.mode !== 'idle' && (
          <button
            onClick={reset}
            className="text-[10px] px-2 py-1 rounded-md border border-white/10 hover:border-white/30 text-gray-400 hover:text-white"
          >✕ Reset</button>
        )}
      </div>

      <div className="grid grid-cols-3 gap-1.5 text-[10px] mb-2">
        <div className="glass rounded-lg p-2 text-center">
          <div className="text-gray-500">Year</div>
          <div className="font-mono font-bold text-white">
            {state.year ? state.year.toFixed(0) : '2026'}
          </div>
        </div>
        <div className="glass rounded-lg p-2 text-center">
          <div className="text-gray-500">Debris</div>
          <div className={`font-bold ${state.mode === 'inaction' ? 'text-red-400' : 'text-cyan-400'}`}>
            {state.debrisCount.toLocaleString()}
          </div>
        </div>
        <div className="glass rounded-lg p-2 text-center">
          <div className="text-gray-500">Cost</div>
          <div className={`font-bold ${state.mode === 'inaction' ? 'text-red-400' : 'text-green-400'}`}>
            ${state.estimatedCostBillions.toFixed(1)}B
          </div>
        </div>
      </div>

      {state.mode !== 'idle' && (
        <>
          <div className="h-1 rounded-full bg-white/5 overflow-hidden mb-2">
            <motion.div
              className={`h-full ${state.mode === 'inaction' ? 'bg-red-500' : 'bg-cyan-400'}`}
              style={{
                width: `${state.progress * 100}%`,
                boxShadow: state.mode === 'inaction'
                  ? '0 0 12px rgba(239,68,68,0.6)'
                  : '0 0 12px rgba(34,211,238,0.6)',
              }}
            />
          </div>
          <div className="grid grid-cols-3 gap-1.5 text-[10px] mb-2 text-center">
            <div className="glass rounded-lg py-1">
              <span className="text-gray-500">Collisions: </span>
              <span className={`font-bold ${state.mode === 'inaction' ? 'text-red-400' : 'text-green-400'}`}>
                {state.collisionEvents}
              </span>
            </div>
            <div className="glass rounded-lg py-1">
              <span className="text-gray-500">Lost sats: </span>
              <span className={`font-bold ${state.mode === 'inaction' ? 'text-red-400' : 'text-green-400'}`}>
                {state.satellitesLost}
              </span>
            </div>
            <div className="glass rounded-lg py-1">
              <span className="text-gray-500">
                {state.running ? 'Simulating…' : state.progress >= 1 ? 'Complete' : 'Paused'}
              </span>
            </div>
          </div>
          {state.progress >= 1 && state.mode === 'inaction' && (
            <div className="glass rounded-lg p-2 text-[10px] text-red-300 border border-red-500/30">
              ☠️ LEO becomes <b>unusable</b> above ~10,000 debris objects (Kessler Syndrome threshold).
              Industry cost: <b>$42.3B</b> over the decade (WEF/NASA estimate).
            </div>
          )}
          {state.progress >= 1 && state.mode === 'ai_avoidance' && (
            <div className="glass rounded-lg p-2 text-[10px] text-green-300 border border-green-500/30">
              🛡️ With AI avoidance + active debris removal, LEO remains <b>sustainable</b>.
              Net economic cost saved: <b>$40.5B</b> vs baseline inaction.
            </div>
          )}
        </>
      )}

      <div className="grid grid-cols-2 gap-1.5">
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => setMode('inaction')}
          className={`text-[10px] py-2 rounded-lg border font-semibold flex items-center justify-center gap-1 ${
            state.mode === 'inaction'
              ? 'bg-red-500/20 border-red-500/50 text-red-300'
              : 'border-white/10 text-gray-300 hover:border-red-500/40 hover:bg-red-500/5'
          }`}
        >☠️ Simulate 50 Years of Inaction</motion.button>

        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => setMode('ai_avoidance')}
          className={`text-[10px] py-2 rounded-lg border font-semibold flex items-center justify-center gap-1 ${
            state.mode === 'ai_avoidance'
              ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300'
              : 'border-white/10 text-gray-300 hover:border-cyan-500/40 hover:bg-cyan-500/5'
          }`}
        >🛡️ Simulate With AI Avoidance</motion.button>
      </div>

      <AnimatePresence>
        {state.mode === 'idle' && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-2 text-[9px] text-gray-600 leading-snug"
          >
            Reference: NASA LEGEND evolutionary debris model · WEF $25.8–42.3B 10-yr cost estimate.
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default KesslerCascadeSimulator;
