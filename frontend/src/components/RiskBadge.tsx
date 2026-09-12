/**
 * NEXORA RiskBadge Component
 * Colored risk level indicator with optional pulse animation
 */

import { motion } from 'framer-motion';

interface RiskBadgeProps {
  level: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  showPulse?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const riskColors = {
  CRITICAL: {
    bg: 'bg-risk-critical',
    text: 'text-risk-critical',
    border: 'border-risk-critical'
  },
  HIGH: {
    bg: 'bg-risk-high',
    text: 'text-risk-high',
    border: 'border-risk-high'
  },
  MEDIUM: {
    bg: 'bg-risk-medium',
    text: 'text-risk-medium',
    border: 'border-risk-medium'
  },
  LOW: {
    bg: 'bg-risk-low',
    text: 'text-risk-low',
    border: 'border-risk-low'
  }
};

const sizes = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-3 py-1 text-sm',
  lg: 'px-4 py-2 text-base'
};

export const RiskBadge = ({ level, showPulse = false, size = 'md' }: RiskBadgeProps) => {
  const colors = riskColors[level];
  
  return (
    <motion.div
      className={`inline-flex items-center ${sizes[size]} rounded-full font-semibold
        ${colors.bg} ${colors.text} bg-opacity-20 border ${colors.border}
        ${showPulse && level === 'CRITICAL' ? 'animate-pulse-slow' : ''}
      `}
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 400, damping: 20 }}
    >
      {level}
    </motion.div>
  );
};

export default RiskBadge;
