/**
 * NEXORA – TcaCountdown
 * Live-updating countdown to Time of Closest Approach.
 * Re-renders every second via setInterval.
 */

import { useState, useEffect } from 'react';

interface TcaCountdownProps {
  tcaIso: string;
  riskLevel: string;
}

const LEVEL_COLOR: Record<string, string> = {
  CRITICAL: 'text-red-400',
  HIGH:     'text-amber-400',
  MEDIUM:   'text-yellow-400',
  LOW:      'text-green-400',
};

function formatDelta(ms: number): { label: string; urgent: boolean } {
  if (ms <= 0) return { label: 'PASSED', urgent: false };
  const totalSec = Math.floor(ms / 1000);
  const d = Math.floor(totalSec / 86400);
  const h = Math.floor((totalSec % 86400) / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;

  const parts: string[] = [];
  if (d > 0) parts.push(`${d}d`);
  parts.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`);

  return { label: parts.join(' '), urgent: totalSec < 3600 };
}

export default function TcaCountdown({ tcaIso, riskLevel }: TcaCountdownProps) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const tca = new Date(tcaIso).getTime();
  const delta = tca - now;
  const { label, urgent } = formatDelta(delta);
  const color = LEVEL_COLOR[riskLevel] ?? 'text-white';

  return (
    <div className="glass rounded-xl p-3 mb-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-0.5">
            Time to TCA
          </div>
          <div className="text-[10px] text-gray-600">
            {new Date(tcaIso).toLocaleString()}
          </div>
        </div>
        <div className={`font-mono font-black text-xl tabular-nums ${color}
          ${urgent ? 'animate-pulse' : ''}`}>
          {label}
        </div>
      </div>
    </div>
  );
}
