import { ConjunctionEvent } from '../services/api';

export interface TrustResult {
  score: number;
  falseAlarmProbability: number;
  reasons: string[];
  warnings: string[];
}

export function computeTrustScore(ev: ConjunctionEvent): TrustResult {
  let score = 50;
  const reasons: string[] = [];
  const warnings: string[] = [];

  const distanceKm = ev.miss_distance_km;
  if (distanceKm < 0.5) { score += 22; reasons.push('Miss distance within 500m safety shell'); }
  else if (distanceKm < 2) { score += 12; reasons.push('Miss distance close to shell'); }
  else if (distanceKm > 10) { score -= 22; warnings.push('Miss >10km — likely noise'); }

  const pc = Math.max(ev.pc_foster, ev.pc_chan);
  if (pc > 1e-4) { score += 18; reasons.push('Pc > 1e-4 (NASA threshold)'); }
  else if (pc > 1e-5) { score += 8; }
  else if (pc < 1e-7) { score -= 16; warnings.push('Pc extremely low'); }

  if (ev.relative_velocity_km_s >= 12) { score += 10; reasons.push('Rel. velocity ≥12 km/s'); }

  const diff = new Date(ev.tca).getTime() - Date.now();
  const hoursTo = diff / 3_600_000;
  if (hoursTo > 0 && hoursTo < 24) { score += 14; reasons.push('TCA within 24h'); }
  else if (hoursTo > 0 && hoursTo < 48) { score += 6; }
  else if (hoursTo > 96) { score -= 14; warnings.push('TCA >4 days — prediction drift'); }

  if (ev.risk_level === 'CRITICAL') score += 10;
  if (ev.risk_level === 'HIGH') score += 5;
  if (ev.risk_level === 'LOW' && distanceKm > 10) { score -= 10; warnings.push('LOW risk + far distance'); }

  if (ev.risk_score !== undefined) {
    if (ev.risk_score >= 75) score += 6;
    else if (ev.risk_score < 25) score -= 6;
  }

  score = Math.max(2, Math.min(98, score));
  const falseAlarm = +(Math.max(0.5, Math.min(97, 100 - score * 0.92))).toFixed(1);
  return { score, falseAlarmProbability: falseAlarm, reasons, warnings };
}

export function trustColor(score: number): string {
  if (score >= 75) return '#22c55e';
  if (score >= 55) return '#eab308';
  if (score >= 35) return '#f97316';
  return '#ef4444';
}

export function trustLabel(score: number): string {
  if (score >= 85) return 'VERIFIED';
  if (score >= 70) return 'HIGH TRUST';
  if (score >= 50) return 'MEDIUM';
  if (score >= 30) return 'LOW';
  return 'NOISE';
}
