/**
 * NEXORA – RiskScoreBar
 * Explainable 0-100 Conjunction Risk Score with factor breakdown.
 * Methodology: distance 50% + velocity 30% + urgency 20%
 * (from Siddhanth17/Nexora reference implementation)
 */

import { motion } from 'framer-motion';

interface RiskScoreBarProps {
  riskScore: number;
  riskCategory: string;
  distanceScore: number;
  velocityScore: number;
  urgencyScore: number;
}

const CATEGORY_COLOR: Record<string, string> = {
  CRITICAL: '#ef4444',
  HIGH:     '#f59e0b',
  MEDIUM:   '#eab308',
  LOW:      '#22c55e',
};

function FactorBar({ label, value, weight, color }: {
  label: string; value: number; weight: number; color: string;
}) {
  return (
    <div>
      <div className="flex justify-between text-[10px] mb-0.5">
        <span className="text-gray-400">{label} <span className="text-gray-600">×{weight}</span></span>
        <span className="font-mono" style={{ color }}>{value.toFixed(0)}</span>
      </div>
      <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: color + 'cc' }}
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ type: 'spring', stiffness: 120, damping: 20, delay: 0.1 }}
        />
      </div>
    </div>
  );
}

export default function RiskScoreBar({
  riskScore, riskCategory, distanceScore, velocityScore, urgencyScore,
}: RiskScoreBarProps) {
  const color = CATEGORY_COLOR[riskCategory] ?? '#6b7280';

  return (
    <div className="glass rounded-xl p-3 space-y-2">
      {/* headline score */}
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-0.5">
            Conjunction Risk Score
          </div>
          <div className="text-[9px] text-gray-600">
            Triage score · not a collision probability
          </div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-black" style={{ color }}>
            {riskScore.toFixed(0)}
          </div>
          <div className="text-[10px] font-semibold" style={{ color }}>{riskCategory}</div>
        </div>
      </div>

      {/* main bar */}
      <div className="h-2 rounded-full bg-white/5 overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: color }}
          initial={{ width: 0 }}
          animate={{ width: `${riskScore}%` }}
          transition={{ type: 'spring', stiffness: 100, damping: 18 }}
        />
      </div>

      {/* factor breakdown */}
      <div className="space-y-1.5 pt-1 border-t border-white/5">
        <FactorBar label="Distance"  value={distanceScore} weight={0.5} color="#60a5fa" />
        <FactorBar label="Velocity"  value={velocityScore} weight={0.3} color="#a78bfa" />
        <FactorBar label="Urgency"   value={urgencyScore}  weight={0.2} color="#fb7185" />
      </div>
    </div>
  );
}
