/**
 * NEXORA – GlobeView (Canvas 2D)
 * Pure canvas globe — no three.js / WebGPU dependency.
 * Draws an orthographic Earth projection with real satellite positions
 * derived from ECI state vectors.
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

/** ECI xyz (km) → { lat °, lng ° } */
function eciToLatLng(r: number[]): { lat: number; lng: number; alt: number } {
  const [x, y, z] = r;
  const norm = Math.sqrt(x * x + y * y + z * z);
  return {
    lat: (Math.asin(z / norm) * 180) / Math.PI,
    lng: (Math.atan2(y, x) * 180) / Math.PI,
    alt: norm - 6371,
  };
}

/** Orthographic projection: lat/lng → canvas x,y (returns null if on back face) */
function project(
  lat: number, lng: number,
  cx: number, cy: number, R: number,
  rotX: number, rotY: number
): { x: number; y: number } | null {
  const phi   = (lat  * Math.PI) / 180;
  const lam   = (lng  * Math.PI) / 180;
  const lamR  = lam - rotY;

  // 3-D point on unit sphere
  let x3 = Math.cos(phi) * Math.cos(lamR);
  let y3 = Math.cos(phi) * Math.sin(lamR);
  let z3 = Math.sin(phi);

  // rotate around X axis
  const cosRX = Math.cos(rotX), sinRX = Math.sin(rotX);
  const y4 = y3 * cosRX - z3 * sinRX;
  const z4 = y3 * sinRX + z3 * cosRX;
  y3 = y4; z3 = z4;

  if (x3 < 0) return null; // back face

  return { x: cx + R * y3, y: cy - R * z3 };
}

/** Great-circle lat-lines for globe grid */
function drawGraticule(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number, R: number,
  rotX: number, rotY: number
) {
  ctx.strokeStyle = 'rgba(99,120,160,0.18)';
  ctx.lineWidth = 0.7;

  // parallels
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

  // meridians
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

export default function GlobeView({ conjunctions, selected, onSelect }: Props) {
  const canvasRef  = useRef<HTMLCanvasElement>(null);
  const frameRef   = useRef<number>(0);
  const rotYRef    = useRef(0);          // auto-spin angle
  const dragRef    = useRef<{ x: number; y: number; lng: number } | null>(null);
  const [hovered, setHovered] = useState<ConjunctionEvent | null>(null);

  /* ── hit-test map for click/hover ── */
  const hitMap = useRef<Array<{ x: number; y: number; r: number; ev: ConjunctionEvent }>>([]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = canvas.width, H = canvas.height;
    const cx = W / 2, cy = H / 2;
    const R  = Math.min(W, H) * 0.42;
    const rotY = rotYRef.current;
    const rotX = 0.35; // slight tilt

    ctx.clearRect(0, 0, W, H);

    // Globe sphere fill
    const grad = ctx.createRadialGradient(cx - R * 0.3, cy - R * 0.3, R * 0.05, cx, cy, R);
    grad.addColorStop(0, '#1a2a4a');
    grad.addColorStop(1, '#080c14');
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, 2 * Math.PI);
    ctx.fillStyle = grad;
    ctx.fill();

    // Atmosphere rim
    const atm = ctx.createRadialGradient(cx, cy, R * 0.96, cx, cy, R * 1.08);
    atm.addColorStop(0, 'rgba(59,130,246,0.25)');
    atm.addColorStop(1, 'rgba(59,130,246,0)');
    ctx.beginPath();
    ctx.arc(cx, cy, R * 1.08, 0, 2 * Math.PI);
    ctx.fillStyle = atm;
    ctx.fill();

    // Globe border
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, 2 * Math.PI);
    ctx.strokeStyle = 'rgba(59,130,246,0.35)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Grid
    drawGraticule(ctx, cx, cy, R, rotX, rotY);

    // Arcs between primary and secondary for CRITICAL/HIGH
    hitMap.current = [];
    conjunctions
      .filter(ev => ev.risk_level === 'CRITICAL' || ev.risk_level === 'HIGH')
      .forEach(ev => {
        const a = eciToLatLng(ev.r_primary);
        const b = eciToLatLng(ev.r_secondary);
        const pa = project(a.lat, a.lng, cx, cy, R, rotX, rotY);
        const pb = project(b.lat, b.lng, cx, cy, R, rotX, rotY);
        if (!pa || !pb) return;

        ctx.beginPath();
        ctx.moveTo(pa.x, pa.y);
        // bezier arc
        const mx = (pa.x + pb.x) / 2, my = (pa.y + pb.y) / 2;
        ctx.quadraticCurveTo(mx, my - 40, pb.x, pb.y);
        ctx.strokeStyle = RISK_COLOR[ev.risk_level] + '66';
        ctx.lineWidth = 1;
        ctx.stroke();
      });

    // Satellite dots
    conjunctions.forEach(ev => {
      const geo = eciToLatLng(ev.r_primary);
      const p   = project(geo.lat, geo.lng, cx, cy, R, rotX, rotY);
      if (!p) return;

      const isSel = selected?.norad_id_primary === ev.norad_id_primary &&
                    selected?.norad_id_secondary === ev.norad_id_secondary;
      const isHov = hovered?.norad_id_primary === ev.norad_id_primary &&
                    hovered?.norad_id_secondary === ev.norad_id_secondary;

      const dotR = ev.risk_level === 'CRITICAL' ? 6
                 : ev.risk_level === 'HIGH'     ? 4.5
                 : ev.risk_level === 'MEDIUM'   ? 3.5
                 : 2.5;

      const color = RISK_COLOR[ev.risk_level];

      // Glow
      if (isSel || ev.risk_level === 'CRITICAL') {
        const glow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, dotR * 4);
        glow.addColorStop(0, color + 'aa');
        glow.addColorStop(1, color + '00');
        ctx.beginPath();
        ctx.arc(p.x, p.y, dotR * 4, 0, 2 * Math.PI);
        ctx.fillStyle = glow;
        ctx.fill();
      }

      // Dot
      ctx.beginPath();
      ctx.arc(p.x, p.y, isSel || isHov ? dotR * 1.6 : dotR, 0, 2 * Math.PI);
      ctx.fillStyle = color;
      ctx.shadowColor = color;
      ctx.shadowBlur  = isSel ? 10 : 4;
      ctx.fill();
      ctx.shadowBlur = 0;

      // Selection ring
      if (isSel) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, dotR * 2.4, 0, 2 * Math.PI);
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      hitMap.current.push({ x: p.x, y: p.y, r: Math.max(dotR * 2, 10), ev });
    });

    // Legend
    ctx.font = '10px monospace';
    ctx.fillStyle = 'rgba(156,163,175,0.8)';
    const legend = [
      { color: RISK_COLOR.CRITICAL, label: 'CRITICAL' },
      { color: RISK_COLOR.HIGH,     label: 'HIGH' },
      { color: RISK_COLOR.MEDIUM,   label: 'MEDIUM' },
      { color: RISK_COLOR.LOW,      label: 'LOW' },
    ];
    legend.forEach((item, i) => {
      const lx = 12, ly = H - 14 - i * 16;
      ctx.beginPath();
      ctx.arc(lx, ly, 4, 0, 2 * Math.PI);
      ctx.fillStyle = item.color;
      ctx.fill();
      ctx.fillStyle = 'rgba(156,163,175,0.7)';
      ctx.fillText(item.label, lx + 10, ly + 3.5);
    });

    frameRef.current = requestAnimationFrame(() => {
      if (!dragRef.current) rotYRef.current += 0.0015; // slow auto-spin
      draw();
    });
  }, [conjunctions, selected, hovered]);

  useEffect(() => {
    draw();
    return () => cancelAnimationFrame(frameRef.current);
  }, [draw]);

  /* ── resize observer ── */
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

  /* ── pointer events ── */
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

  const handleMouseMove = (e: React.MouseEvent) => {
    setHovered(getHit(e.clientX, e.clientY));
  };
  const handleClick = (e: React.MouseEvent) => {
    const hit = getHit(e.clientX, e.clientY);
    if (hit) onSelect(hit);
  };
  const handleMouseDown = (e: React.MouseEvent) => {
    dragRef.current = { x: e.clientX, y: e.clientY, lng: rotYRef.current };
  };
  const handleMouseUp = () => { dragRef.current = null; };
  const handleMouseDrag = (e: React.MouseEvent) => {
    if (!dragRef.current) return;
    const dx = e.clientX - dragRef.current.x;
    rotYRef.current = dragRef.current.lng + dx * 0.005;
  };

  return (
    <div className="relative w-full h-full" style={{ minHeight: 520 }}>
      <canvas
        ref={canvasRef}
        className="w-full h-full cursor-grab active:cursor-grabbing"
        onMouseMove={e => { handleMouseMove(e); handleMouseDrag(e); }}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onClick={handleClick}
      />

      {/* Hovered tooltip */}
      {hovered && (
        <motion.div
          className="absolute bottom-4 left-1/2 -translate-x-1/2 glass px-3 py-2 text-xs pointer-events-none text-center"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="font-semibold">{hovered.norad_id_primary} ↔ {hovered.norad_id_secondary}</div>
          <div className="text-gray-400">{hovered.miss_distance_km.toFixed(2)} km miss · Click to select</div>
        </motion.div>
      )}

      {/* Drag hint */}
      <div className="absolute top-10 left-1/2 -translate-x-1/2 text-[10px] text-gray-600 pointer-events-none">
        Drag to rotate · Click dot to select
      </div>
    </div>
  );
}
