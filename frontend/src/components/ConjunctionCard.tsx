/**
 * NEXORA ConjunctionCard
 * Clickable conjunction event card with risk badge and key stats
 */

import { motion } from 'framer-motion';
import { ConjunctionEvent } from '../services/api';
import RiskBadge from './RiskBadge';

interface ConjunctionCardProps {
  event: ConjunctionEvent;
  onSelect: (ev: ConjunctionEvent) => void;
  isSelected: boolean;
}

const KNOWN: Record<string, string> = {
  '22675': 'COSMOS 2251',   '44714': 'STARLINK-1008',
  '44718': 'STARLINK-1012', '44723': 'STARLINK-1017',
  '44725': 'STARLINK-1019', '44741': 'STARLINK-1035',
  '44744': 'STARLINK-1038', '44747': 'STARLINK-1041',
  '44748': 'STARLINK-1042', '44751': 'STARLINK-1045',
  '44752': 'STARLINK-1046', '44753': 'STARLINK-1047',
  '44768': 'STARLINK-1062', '44772': 'STARLINK-1066',
  '45044': 'STARLINK-1315', '45047': 'STARLINK-1318',
  '45061': 'STARLINK-1332',
};
const name = (id: string) => KNOWN[id] ?? `SAT-${id}`;

// Time-to-TCA label
function ttcLabel(tcaIso: string): string {
  const diff = new Date(tcaIso).getTime() - Date.now();
  if (diff < 0) return 'Passed';
  const h = Math.floor(diff / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  if (h > 48) return `${Math.floor(h / 24)}d ${h % 24}h`;
  return `${h}h ${m}m`;
}

export default function ConjunctionCard({ event, onSelect, isSelected }: ConjunctionCardProps) {
  return (
    <motion.div
      onClick={() => onSelect(event)}
      className={`glass p-3 cursor-pointer select-none
        ${isSelected
          ? 'ring-1 ring-blue-500/80 bg-blue-950/20'
          : 'hover:ring-1 ring-white/10 hover:bg-white/5'}`}
      whileHover={{ scale: 1.015 }}
      whileTap={{ scale: 0.985 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
    >
      {/* top row */}
      <div className="flex items-start justify-between mb-2 gap-2">
        <div className="min-w-0">
          <div className="text-xs font-semibold text-white truncate">
            {name(event.norad_id_primary)}
          </div>
          <div className="text-[10px] text-gray-500 truncate">
            ↔ {name(event.norad_id_secondary)}
          </div>
        </div>
        <RiskBadge
          level={event.risk_level}
          showPulse={event.risk_level === 'CRITICAL'}
          size="sm"
        />
      </div>

      {/* stats row */}
      <div className="grid grid-cols-3 gap-1 text-[11px]">
        <div>
          <div className="text-gray-500">Miss</div>
          <div className="font-bold text-white">{event.miss_distance_km.toFixed(2)} km</div>
        </div>
        <div>
          <div className="text-gray-500">Pc</div>
          <div className="font-mono font-bold text-white">{event.pc_foster.toExponential(1)}</div>
        </div>
        <div>
          <div className="text-gray-500">TCA in</div>
          <div className="font-bold text-white">{ttcLabel(event.tca)}</div>
        </div>
      </div>
    </motion.div>
  );
}
