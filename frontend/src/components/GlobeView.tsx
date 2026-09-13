/**
 * NEXORA – GlobeView (Canvas 2D)
 * Orthographic Earth with:
 *   • Satellite dots colored by risk level + glow + selection ring
 *   • Conjunction arcs (CRITICAL/HIGH)
 *   • 90-min orbital trail for the selected satellite (Tasks 2)
 *   • Drag-to-rotate, auto-spin, click/hover hit-testing
 */

import { useRef, useEffect, useCallback, useState } from 'react';
import { motion } from 'framer-motion';
import { ConjunctionEvent } from '../services/api';

interface Props {
  conjunctions: ConjunctionEvent[];
  selected: ConjunctionEvent | null;
  onSelect: (ev: ConjunctionEvent) => void;
}

const RISK_COLOR: Record<string, string> = {
  CRITICAL: '#ef4444',
  HIGH:     '#f59e0b',
  MEDIUM:   '#eab308',
  LOW:      '#22c55e',
};

// Earth's gravitational parameter (km³/s²)
const MU = 398600.4418;
// Earth radius (km)
const RE = 6371.0;

/* ── maths ─────────────────────────────────────────────────── */

function eciToLatLng(r: number[]): { lat: number; lng: number } {
  const [x, y, z] = r;
  const norm = Math.sqrt(x * x + y * y + z * z);
  return {
    lat: (Math.asin(z / norm) * 180) / Math.PI,
    lng: (Math.atan2(y, x) * 180) / Math.PI,
  };
}

/**
 * Propagate a circular-ish orbit forward by `steps` × `dt` seconds
 * using simple Kepler rotation around the angular momentum vector.
 * Accurate enough for a visual trail (≈ SGP4 without drag/perturbations).
 */
function propagateOrbitTrail(
  r0: number[], v0: number[],
  steps: number, dt: number       // dt in seconds
): Array<{ lat: number; lng: number }> {
  // Angular momentum unit vector
  const hx = r0[1] * v0[2] - r0[2] * v0[1];
  const hy = r0[2] * v0[0] - r0[0] * v0[2];
  const hz = r0[0] * v0[1] - r0[1] * v0[0];
  const hMag = Math.sqrt(hx * hx + hy * hy + hz * hz);
  const hHat = [hx / hMag, hy / hMag, hz / hMag];

  // Semi-major axis from vis-viva
  const rMag = Math.sqrt(r0[0] ** 2 + r0[1] ** 2 + r0[2] ** 2);
  const vMag = Math.sqrt(v0[0] ** 2 + v0[1] ** 2 + v0[2] ** 2);
  const a    = 1.0 / (2.0 / rMag - vMag * vMag / MU);
  const n    = Math.sqrt(MU / Math.pow(Math.max(a, RE + 100), 3)); // mean motion rad/s

  const trail: Array<{ lat: number; lng: number }> = [];

  for (let i = 0; i <= steps; i++) {
    const theta = n * i * dt; // angle rotated around h

    // Rodrigues' rotation formula: rotate r0 by theta around hHat
    const cosT = Math.cos(theta), sinT = Math.sin(theta);
    const dot = r0[0] * hHat[0] + r0[1] * hHat[1] + r0[2] * hHat[2];
    const cross = [
      hHat[1] * r0[2] - hHat[2] * r0[1],
      hHat[2] * r0[0] - hHat[0] * r0[2],
      hHat[0] * r0[1] - hHat[1] * r0[0],
    ];
    const rx = r0[0] * cosT + cross[0] * sinT + hHat[0] * dot * (1 - cosT);
    const ry = r0[1] * cosT + cross[1] * sinT + hHat[1] * dot * (1 - cosT);
    const rz = r0[2] * cosT + cross[2] * sinT + hHat[2] * dot * (1 - cosT);

    trail.push(eciToLatLng([rx, ry, rz]));
  }

  return trail;
}

function project(
  lat: number, lng: number,
  cx: number, cy: number, R: number,
  rotX: number, rotY: number
): { x: number; y: number } | null {
  const phi  = (lat * Math.PI) / 180;
  const lam  = (lng * Math.PI) / 180;
  const lamR = lam - rotY;

  let x3 = Math.cos(phi) * Math.cos(lamR);
  let y3 = Math.cos(phi) * Math.sin(lamR);
  let z3 = Math.sin(phi);

  const cosRX = Math.cos(rotX), sinRX = Math.sin(rotX);
  const y4 = y3 * cosRX - z3 * sinRX;
  const z4 = y3 * sinRX + z3 * cosRX;
  y3 = y4; z3 = z4;

  if (x3 < 0) return null; // back-face culled

  return { x: cx + R * y3, y: cy - R * z3 };
}

function drawGraticule(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number, R: number,
  rotX: number, rotY: number
) {
  ctx.strokeStyle = 'rgba(99,120,160,0.15)';
  ctx.lineWidth = 0.6;
  for (let lat = -75; lat <= 75; lat += 15) {
    ctx.beginPath();
    let first = true;
    for (let lng = -180; lng <= 180; lng += 3) {
      const p = project(lat, lng, cx, cy, R, rotX, rotY);
      if (!p) { first = true; continue; }
      first ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y);
      first = false;
    }
    ctx.stroke();
  }
  for (let lng = -180; lng < 180; lng += 15) {
    ctx.beginPath();
    let first = true;
    for (let lat = -90; lat <= 90; lat += 3) {
      const p = project(lat, lng, cx, cy, R, rotX, rotY);
      if (!p) { first = true; continue; }
      first ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y);
      first = false;
    }
    ctx.stroke();
  }
}

/** Draw a smooth orbit trail with fade-out toward the end */
function drawTrail(
  ctx: CanvasRenderingContext2D,
  trail: Array<{ lat: number; lng: number }>,
  cx: number, cy: number, R: number,
  rotX: number, rotY: number,
  color: string
) {
  for (let i = 1; i < trail.length; i++) {
    const pa = project(trail[i - 1].lat, trail[i - 1].lng, cx, cy, R, rotX, rotY);
    const pb = project(trail[i].lat,     trail[i].lng,     cx, cy, R, rotX, rotY);
    if (!pa || !pb) continue;

    // Skip segments that cross the back face (large jumps)
    const dx = pb.x - pa.x, dy = pb.y - pa.y;
    if (dx * dx + dy * dy > (R * 0.5) ** 2) continue;

    const alpha = 0.05 + 0.55 * (i / trail.length); // fade in toward current pos
    ctx.beginPath();
    ctx.moveTo(pa.x, pa.y);
    ctx.lineTo(pb.x, pb.y);
    ctx.strokeStyle = color + Math.round(alpha * 255).toString(16).padStart(2, '0');
    ctx.lineWidth = 1.2;
    ctx.stroke();
  }
}

/* ── Component ──────────────────────────────────────────────── */

export default function GlobeView({ conjunctions, selected, onSelect }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef  = useRef<number>(0);
  const rotYRef   = useRef(0);
  const dragRef   = useRef<{ x: number; y: number; lng: number } | null>(null);
  const [hovered, setHovered] = useState<ConjunctionEvent | null>(null);
  const hitMap = useRef<Array<{ x: number; y: number; r: number; ev: ConjunctionEvent }>>([]);

  // Pre-compute trail for the selected event (primary satellite, ~90 min)
  const selectedTrail = useRef<Array<{ lat: number; lng: number }>>([]);
  useEffect(() => {
    if (!selected) { selectedTrail.current = []; return; }
    try {
      // 90 min at 60-second steps = 90 trail points
      selectedTrail.current = propagateOrbitTrail(
        selected.r_primary, selected.v_primary,
        90, 60
      );
    } catch { selectedTrail.current = []; }
  }, [selected?.norad_id_primary, selected?.norad_id_secondary]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = canvas.width, H = canvas.height;
    const cx = W / 2, cy = H / 2;
    const R  = Math.min(W, H) * 0.42;
    const rotY = rotYRef.current;
    const rotX = 0.35;

    ctx.clearRect(0, 0, W, H);

    /* ── Globe sphere ── */
    const grad = ctx.createRadialGradient(cx - R * 0.3, cy - R * 0.3, R * 0.05, cx, cy, R);
    grad.addColorStop(0, '#1a2a4a');
    grad.addColorStop(1, '#080c14');
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, 2 * Math.PI);
    ctx.fillStyle = grad;
    ctx.fill();

    /* ── Atmosphere ── */
    const atm = ctx.createRadialGradient(cx, cy, R * 0.96, cx, cy, R * 1.08);
    atm.addColorStop(0, 'rgba(59,130,246,0.22)');
    atm.addColorStop(1, 'rgba(59,130,246,0)');
    ctx.beginPath();
    ctx.arc(cx, cy, R * 1.08, 0, 2 * Math.PI);
    ctx.fillStyle = atm;
    ctx.fill();

    /* ── Border ── */
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, 2 * Math.PI);
    ctx.strokeStyle = 'rgba(59,130,246,0.30)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    /* ── Grid ── */
    drawGraticule(ctx, cx, cy, R, rotX, rotY);

    /* ── Orbit trail for selected satellite ── */
    if (selected && selectedTrail.current.length > 0) {
      const color = RISK_COLOR[selected.risk_level] ?? '#60a5fa';
      drawTrail(ctx, selectedTrail.current, cx, cy, R, rotX, rotY, color);
    }

    /* ── Conjunction arcs (CRITICAL / HIGH) ── */
    hitMap.current = [];
    conjunctions
      .filter(ev => ev.risk_level === 'CRITICAL' || ev.risk_level === 'HIGH')
      .forEach(ev => {
        const a = eciToLatLng(ev.r_primary);
        const b = eciToLatLng(ev.r_secondary);
        const pa = project(a.lat, a.lng, cx, cy, R, rotX, rotY);
        const pb = project(b.lat, b.lng, cx, cy, R, rotX, rotY);
        if (!pa || !pb) return;
        const mx = (pa.x + pb.x) / 2, my = (pa.y + pb.y) / 2;
        ctx.beginPath();
        ctx.moveTo(pa.x, pa.y);
        ctx.quadraticCurveTo(mx, my - R * 0.08, pb.x, pb.y);
        ctx.strokeStyle = RISK_COLOR[ev.risk_level] + '55';
        ctx.lineWidth = 1;
        ctx.stroke();
      });

    /* ── Satellite dots ── */
    conjunctions.forEach(ev => {
      const geo = eciToLatLng(ev.r_primary);
      const p   = project(geo.lat, geo.lng, cx, cy, R, rotX, rotY);
      if (!p) return;

      const isSel = selected?.norad_id_primary   === ev.norad_id_primary &&
                    selected?.norad_id_secondary === ev.norad_id_secondary;
      const isHov = hovered?.norad_id_primary    === ev.norad_id_primary &&
                    hovered?.norad_id_secondary  === ev.norad_id_secondary;
      const color = RISK_COLOR[ev.risk_level];
      const dotR  = ev.risk_level === 'CRITICAL' ? 6
                  : ev.risk_level === 'HIGH'      ? 4.5
                  : ev.risk_level === 'MEDIUM'    ? 3.5
                  : 2.5;

      // Glow for CRITICAL or selected
      if (isSel || ev.risk_level === 'CRITICAL') {
        const glow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, dotR * 5);
        glow.addColorStop(0, color + 'aa');
        glow.addColorStop(1, color + '00');
        ctx.beginPath();
        ctx.arc(p.x, p.y, dotR * 5, 0, 2 * Math.PI);
        ctx.fillStyle = glow;
        ctx.fill();
      }

      // Dot
      ctx.beginPath();
      ctx.arc(p.x, p.y, (isSel || isHov) ? dotR * 1.7 : dotR, 0, 2 * Math.PI);
      ctx.fillStyle = color;
      ctx.shadowColor = color;
      ctx.shadowBlur  = isSel ? 12 : 4;
      ctx.fill();
      ctx.shadowBlur = 0;

      // Selection ring
      if (isSel) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, dotR * 2.6, 0, 2 * Math.PI);
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.5;
        ctx.stroke();
        // Second outer ring, pulsing handled by re-render speed
        ctx.beginPath();
        ctx.arc(p.x, p.y, dotR * 3.6, 0, 2 * Math.PI);
        ctx.strokeStyle = color + '44';
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // Secondary object dot (smaller, dimmer)
      const geoS = eciToLatLng(ev.r_secondary);
      const ps   = project(geoS.lat, geoS.lng, cx, cy, R, rotX, rotY);
      if (ps) {
        ctx.beginPath();
        ctx.arc(ps.x, ps.y, dotR * 0.5, 0, 2 * Math.PI);
        ctx.fillStyle = color + '66';
        ctx.fill();
      }

      hitMap.current.push({ x: p.x, y: p.y, r: Math.max(dotR * 2.2, 10), ev });
    });

    /* ── Legend ── */
    ctx.font = '10px monospace';
    const legend = [
      { color: RISK_COLOR.CRITICAL, label: 'CRITICAL' },
      { color: RISK_COLOR.HIGH,     label: 'HIGH'     },
      { color: RISK_COLOR.MEDIUM,   label: 'MEDIUM'   },
      { color: RISK_COLOR.LOW,      label: 'LOW'      },
    ];
    legend.forEach((item, i) => {
      const lx = 14, ly = H - 14 - i * 17;
      ctx.beginPath();
      ctx.arc(lx, ly, 4, 0, 2 * Math.PI);
      ctx.fillStyle = item.color;
      ctx.fill();
      ctx.fillStyle = 'rgba(156,163,175,0.65)';
      ctx.fillText(item.label, lx + 10, ly + 3.5);
    });

    // Trail label
    if (selected && selectedTrail.current.length > 0) {
      ctx.fillStyle = 'rgba(156,163,175,0.5)';
      ctx.font = '9px monospace';
      ctx.fillText('— 90-min orbital trail', 14, H - 14 - legend.length * 17 - 8);
    }

    frameRef.current = requestAnimationFrame(() => {
      if (!dragRef.current) rotYRef.current += 0.0012;
      draw();
    });
  }, [conjunctions, selected, hovered]);

  useEffect(() => {
    draw();
    return () => cancelAnimationFrame(frameRef.current);
  }, [draw]);

  /* ── resize ── */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const obs = new ResizeObserver(() => {
      canvas.width  = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    });
    obs.observe(canvas);
    canvas.width  = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    return () => obs.disconnect();
  }, []);

  /* ── pointer ── */
  const getHit = (ex: number, ey: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const mx = ex - rect.left, my = ey - rect.top;
    for (const h of hitMap.current) {
      const dx = mx - h.x, dy = my - h.y;
      if (dx * dx + dy * dy <= h.r * h.r) return h.ev;
    }
    return null;
  };

  return (
    <div className="relative w-full h-full" style={{ minHeight: 520 }}>
      <canvas
        ref={canvasRef}
        className="w-full h-full cursor-grab active:cursor-grabbing"
        onMouseMove={e => {
          setHovered(getHit(e.clientX, e.clientY));
          if (dragRef.current) {
            const dx = e.clientX - dragRef.current.x;
            rotYRef.current = dragRef.current.lng + dx * 0.005;
          }
        }}
        onMouseDown={e => { dragRef.current = { x: e.clientX, y: e.clientY, lng: rotYRef.current }; }}
        onMouseUp={() => { dragRef.current = null; }}
        onMouseLeave={() => { dragRef.current = null; }}
        onClick={e => { const hit = getHit(e.clientX, e.clientY); if (hit) onSelect(hit); }}
      />

      {/* Hover tooltip */}
      {hovered && (
        <motion.div
          className="absolute bottom-5 left-1/2 -translate-x-1/2 glass px-3 py-2 text-xs pointer-events-none text-center whitespace-nowrap"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
        >
          <div className="font-semibold">{hovered.norad_id_primary} ↔ {hovered.norad_id_secondary}</div>
          <div className="text-gray-400">{hovered.miss_distance_km.toFixed(2)} km miss · Click to select</div>
        </motion.div>
      )}

      <div className="absolute top-10 left-1/2 -translate-x-1/2 text-[9px] text-gray-700 pointer-events-none select-none">
        Drag to rotate · Click dot to inspect
      </div>
    </div>
  );
}
