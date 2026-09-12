/**
 * NEXORA ConjunctionCard Component
 * Displays a single conjunction event with click-to-expand via layoutId
 */

import { motion } from 'framer-motion';
import { ConjunctionEvent } from '../services/api';
import RiskBadge from './RiskBadge';

interface ConjunctionCardProps {
  event: ConjunctionEvent;
  onSelect: (event: ConjunctionEvent) => void;
  isSelected: boolean;
}

export const ConjunctionCard = ({ event, onSelect, isSelected }: ConjunctionCardProps) => {
  const conjunctionId = `${event.norad_id_primary}_${event.norad_id_secondary}`;
  
  return (
    <motion.div
      layoutId={conjunctionId}
      onClick={() => onSelect(event)}
      className={`
        glass p-4 cursor-pointer transition-all
        ${isSelected ? 'ring-2 ring-blue-500' : 'hover:ring-1 ring-white/20'}
      `}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1">
          <div className="text-sm text-gray-400 mb-1">
            {event.norad_id_primary} ↔ {event.norad_id_secondary}
          </div>
          <div className="text-xs text-gray-500">
            TCA: {new Date(event.tca).toLocaleString()}
          </div>
        </div>
        <RiskBadge 
          level={event.risk_level} 
          showPulse={event.risk_level === 'CRITICAL'}
          size="sm"
        />
      </div>
      
      <div className="grid grid-cols-2 gap-2 text-xs mt-3">
        <div>
          <div className="text-gray-500">Miss Distance</div>
          <div className="text-white font-semibold">
            {event.miss_distance_km.toFixed(2)} km
          </div>
        </div>
        <div>
          <div className="text-gray-500">Collision Prob</div>
          <div className="text-white font-semibold">
            {event.pc_foster.toExponential(2)}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default ConjunctionCard;
