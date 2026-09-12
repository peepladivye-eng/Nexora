/**
 * NEXORA StatCounter Component
 * Animated number counter using Framer Motion
 */

import { useEffect, useRef } from 'react';
import { useMotionValue, useSpring, motion, useTransform } from 'framer-motion';

interface StatCounterProps {
  value: number;
  decimals?: number;
  suffix?: string;
  prefix?: string;
  className?: string;
}

export const StatCounter = ({ 
  value, 
  decimals = 0, 
  suffix = '', 
  prefix = '',
  className = ''
}: StatCounterProps) => {
  const motionValue = useMotionValue(0);
  const springValue = useSpring(motionValue, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001
  });
  
  const display = useTransform(springValue, (latest) => {
    return prefix + latest.toFixed(decimals) + suffix;
  });
  
  const prevValue = useRef(value);
  
  useEffect(() => {
    if (prevValue.current !== value) {
      motionValue.set(value);
      prevValue.current = value;
    }
  }, [value, motionValue]);
  
  return (
    <motion.span className={className}>
      <motion.span>{display}</motion.span>
    </motion.span>
  );
};

export default StatCounter;
