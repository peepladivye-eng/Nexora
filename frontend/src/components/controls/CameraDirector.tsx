/**
 * ORBITGUARD – CameraDirector
 * Lives inside the Canvas. Responsibilities:
 *  1. Consumes focus requests (planet fly-to, earth-orbit, satellite follow)
 *  2. Smoothly flies the camera + OrbitControls target with easing
 *  3. Tracks camera→Earth distance into the store (zoom-level detection)
 *  4. Executes discrete zoom in/out commands from the UI controls
 *  5. Pauses auto-rotate during flights and resumes it after idle
 */
import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import * as THREE from 'three';
import { PLANET_BY_ID } from '../../data/planets';
import { getObjectPosition, directorBusy } from '../../data/registry';
import { useOrbitGuard } from '../../store/orbitGuard';

const FLY_DURATION = 1.8; // seconds
const IDLE_RESUME_MS = 4000;

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/** zoom level from camera distance to Earth (visual units) */
function levelForDistance(d: number) {
  if (d > 40) return 'system' as const;
  if (d >= 30) return 'planetary' as const;
  if (d >= 10) return 'regional' as const;
  return 'close' as const;
}

export default function CameraDirector() {
  const { camera } = useThree();
  const controls = useThree((s) => s.controls) as OrbitControlsImpl | null;

  const focus = useOrbitGuard((s) => s.focus);
  const zoomCommand = useOrbitGuard((s) => s.zoomCommand);
  const consumeZoomCommand = useOrbitGuard((s) => s.consumeZoomCommand);
  const setZoomLevel = useOrbitGuard((s) => s.setZoomLevel);

  const flight = useRef<{
    active: boolean;
    t: number;
    fromPos: THREE.Vector3;
    toPos: THREE.Vector3;
    fromTarget: THREE.Vector3;
    toTarget: THREE.Vector3;
    followId: string | null;
    /** offset magnitude the camera keeps from a followed object */
    followDist: number;
    azimuth: number;
    elevation: number;
    /** at nonce-change we snap-follow; else we fly */
    lastNonce: number;
  }>({
    active: false, t: 0,
    fromPos: new THREE.Vector3(), toPos: new THREE.Vector3(),
    fromTarget: new THREE.Vector3(), toTarget: new THREE.Vector3(),
    followId: null, followDist: 3, azimuth: 0.9, elevation: 0.35,
    lastNonce: -1,
  });

  const idleTimer = useRef<number | null>(null);
  const lastLevel = useRef<string | null>(null);

  const armIdleResume = () => {
    if (!controls) return;
    controls.autoRotate = false;
    if (idleTimer.current) window.clearTimeout(idleTimer.current);
    idleTimer.current = window.setTimeout(() => {
      if (controls) controls.autoRotate = true;
    }, IDLE_RESUME_MS);
  };

  // pause auto-rotate as soon as the user interacts
  useEffect(() => {
    if (!controls) return;
    const onInteract = () => armIdleResume();
    controls.addEventListener('start', onInteract);
    return () => {
      controls.removeEventListener('start', onInteract);
      if (idleTimer.current) window.clearTimeout(idleTimer.current);
    };
  }, [controls]);

  // begin a flight when a new focus request arrives
  useEffect(() => {
    if (!focus || !controls) return;
    const f = flight.current;

    let targetWorld: THREE.Vector3 | null = null;
    if (focus.kind === 'satellite') {
      targetWorld = getObjectPosition(`sat:${focus.id}`) ?? null;
    } else {
      const cfg = PLANET_BY_ID[focus.id];
      if (!cfg) return;
      targetWorld = getObjectPosition(`planet:${focus.id}`) ?? null;
    }
    if (!targetWorld) return;

    const start = new THREE.Vector3().copy(targetWorld);

    if (focus.kind === 'earth-orbit') {
      f.followDist = 4.2; // far enough to see the satellite shell
    } else if (focus.kind === 'satellite') {
      f.followDist = 0.9;
    } else {
      const cfg = PLANET_BY_ID[focus.id];
      f.followDist = Math.max(cfg.radius * 4.5, 1.6);
    }

    f.azimuth = Math.atan2(camera.position.z - start.z, camera.position.x - start.x);
    f.elevation = 0.32;

    const dir = new THREE.Vector3().subVectors(camera.position, start).normalize();
    if (!isFinite(dir.x) || dir.lengthSq() < 0.5) dir.set(1, 0.4, 1).normalize();
    f.toPos.copy(start).addScaledVector(dir, f.followDist);
    f.toTarget.copy(start);

    f.fromPos.copy(camera.position);
    f.fromTarget.copy(controls.target);
    f.t = 0;
    f.active = true;
    f.followId = focus.kind === 'satellite' ? `sat:${focus.id}` : null;
    f.lastNonce = focus.nonce;
    directorBusy.busy = true;
    controls.autoRotate = false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focus?.nonce, controls]);

  useFrame((_, delta) => {
    const f = flight.current;
    const earthPos = getObjectPosition('planet:earth');

    // ── live zoom-level tracking ──
    if (earthPos) {
      const d = camera.position.distanceTo(earthPos);
      const lvl = levelForDistance(d);
      if (lastLevel.current !== lvl) {
        lastLevel.current = lvl;
        setZoomLevel(lvl, d);
      } else {
        useOrbitGuard.setState({ cameraDistanceToEarth: d });
      }
    }

    // ── discrete zoom commands ──
    if (zoomCommand && controls) {
      const dirV = new THREE.Vector3().subVectors(camera.position, controls.target);
      const len = dirV.length();
      const factor = zoomCommand === 'in' ? 0.78 : 1.28;
      const next = THREE.MathUtils.clamp(len * factor, controls.minDistance ?? 2, controls.maxDistance ?? 500);
      camera.position.copy(controls.target).addScaledVector(dirV.normalize(), next);
      consumeZoomCommand();
    }

    // ── flight / follow ──
    if (f.active) {
      f.t = Math.min(1, f.t + delta / FLY_DURATION);
      const k = easeInOutCubic(f.t);

      // live follow target (satellites move during the flight)
      let anchor: THREE.Vector3 | null = null;
      if (f.followId) {
        anchor = getObjectPosition(f.followId) ?? null;
      } else {
        const id = focus?.kind === 'planet' ? `planet:${focus.id}` : null;
        anchor = id ? getObjectPosition(id) ?? null : null;
      }

      if (anchor) {
        // recompute desired end each frame so we land on a moving target
        const dir = new THREE.Vector3().subVectors(camera.position, anchor);
        if (dir.lengthSq() < 1e-6) dir.set(1, 0.4, 1);
        dir.normalize();
        f.toPos.copy(anchor).addScaledVector(dir, f.followDist);
        f.toTarget.copy(anchor);
      }

      camera.position.lerpVectors(f.fromPos, f.toPos, k);
      if (controls) {
        controls.target.lerpVectors(f.fromTarget, f.toTarget, k);
        controls.update();
      }

      if (f.t >= 1) {
        f.active = false;
        directorBusy.busy = false;
        armIdleResume();
      }
    }
  });

  return null;
}
