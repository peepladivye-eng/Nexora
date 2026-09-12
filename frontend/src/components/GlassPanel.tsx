/**
 * NEXORA GlassPanel Component
 * Reusable glassmorphic container with Framer Motion animations
 */

import { motion, HTMLMotionProps } from 'framer-motion';
import { ReactNode } from 'react';

interface GlassPanelProps extends Omit<HTMLMotionProps<"div">, "children"> {
  children: ReactNode;
  className?: string;
}

export const GlassPanel = ({ children, className = '', ...motionProps }: GlassPanelProps) => {
  return (
    <motion.div
      className={`glass ${className}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      {...motionProps}
    >
      {children}
    </motion.div>
  );
};

export default GlassPanel;
