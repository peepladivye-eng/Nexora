/**
 * ORBITGUARD – CameraDirector
 * Lives inside the Canvas. Responsibilities:
 *  1. Consumes focus requests (planet fly-to, earth-orbit, satellite follow)
 *  2. Smoothly flies the camera + OrbitControls target with easing
 *  3. PERSISTS following the anchor after arrival (planets keep orbiting,
 *     so the camera rig must translate with them)
 *  4. Handles the overview (system view) request
 *  5. Tracks camera→Earth distance into the store (zoom-level detection)
 *  6. Executes discrete zoom in/out commands from the UI controls
 */
import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import * as THREE from 'three';
import { PLANET_BY_ID } from '../../data/planets';
import { getObjectPosition, directorBusy } from '../../data/registry';
import { useOrbitGuard } from '../../store/orbitGuard';

const FLY_DURATION = 1.8; // seconds
const OVERVIEW_DISTANCE = 95;
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

interface FlightState {
  active: boolean;
  t: number;
  fromPos: THREE.Vector3;
  toPos: THREE.Vector3;
  fromTarget: THREE.Vector3;
  toTarget: THREE.Vector3;
  /** registry id of the object we are flying to / following */
  anchorId: string | null;
  /** offset magnitude kept from the anchor */
  followDist: number;
  /** follow after landing (planets/satellites keep moving) */
  persistFollow: boolean;
  lastAnchorPos: THREE.Vector3;
}

export default function CameraDirector() {
  const { camera } = useThree();
  const controls = useThree((s) => s.controls) as OrbitControlsImpl | null;

  const focus = useOrbitGuard((s) => s.focus);
  const zoomCommand = useOrbitGuard((s) => s.zoomCommand);
  const consumeZoomCommand = useOrbitGuard((s) => s.consumeZoomCommand);
  const setZoomLevel = useOrbitGuard((s) => s.setZoomLevel);

  const flight = useRef<FlightState>({
    active: false, t: 0,
    fromPos: new THREE.Vector3(), toPos: new THREE.Vector3(),
    fromTarget: new THREE.Vector3(), toTarget: new THREE.Vector3(),
    anchorId: null, followDist: 3, persistFollow: false,
    lastAnchorPos: new THREE.Vector3(),
  });

  const idleTimer = useRef<number | null>(null);
  const lastLevel = useRef<string | null>(null);

  const armIdleResume = () => {
    if (!controls) return;
    controls.autoRotate = false;
    if (idleTimer.current) window.clearTimeout(idleTimer.current);
    idleTimer.current = window.setTimeout(() => {
      const wantAuto = useOrbitGuard.getState().autoRotate;
      if (controls && wantAuto) controls.autoRotate = true;
    }, IDLE_RESUME_MS);
  };

  // pause auto-rotate when the user interacts
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

    // ── overview: pull back to the full system view ──
    if (focus.kind === 'overview') {
      const dir = new THREE.Vector3().subVectors(camera.position, controls.target);
      if (dir.lengthSq() < 1e-6) dir.set(1, 0.7, 1.4);
      dir.normalize();
      f.anchorId = null;
      f.persistFollow = false;
      f.followDist = OVERVIEW_DISTANCE;
      f.toPos.copy(dir).multiplyScalar(OVERVIEW_DISTANCE).add(new THREE.Vector3(0, 18, 0));
      f.toTarget.set(0, 0, 0);
      f.fromPos.copy(camera.position);
      f.fromTarget.copy(controls.target);
      f.t = 0;
      f.active = true;
      directorBusy.busy = true;
      controls.autoRotate = false;
      return;
    }

    // ── fly to planet / earth-orbit / satellite ──
    const registryId =
      focus.kind === 'satellite'
        ? `sat:${focus.id}`
        : `planet:${focus.id}`;
    const anchor = getObjectPosition(registryId);
    if (!anchor) return;

    if (focus.kind === 'earth-orbit') {
      f.followDist = focus.distance ?? 4.2;
    } else if (focus.kind === 'satellite') {
      f.followDist = 0.35;
    } else {
      const cfg = PLANET_BY_ID[focus.id];
      f.followDist = Math.max(cfg.radius * 4.5, 1.6);
    }

    const dir = new THREE.Vector3().subVectors(camera.position, anchor);
    if (dir.lengthSq() < 1e-6) dir.set(1, 0.4, 1);
    dir.normalize();

    f.anchorId = registryId;
    f.persistFollow = true;
    f.toPos.copy(anchor).addScaledVector(dir, f.followDist);
    f.toTarget.copy(anchor);
    f.fromPos.copy(camera.position);
    f.fromTarget.copy(controls.target);
    f.t = 0;
    f.active = true;
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
      const next = THREE.MathUtils.clamp(len * factor, controls.minDistance ?? 0.2, controls.maxDistance ?? 500);
      camera.position.copy(controls.target).addScaledVector(dirV.normalize(), next);
      consumeZoomCommand();
    }

    // ── flight phase ──
    if (f.active) {
      f.t = Math.min(1, f.t + delta / FLY_DURATION);
      const k = easeInOutCubic(f.t);

      // re-anchor to a moving target every frame during the flight
      if (f.anchorId) {
        const anchor = getObjectPosition(f.anchorId);
        if (anchor) {
          const dir = new THREE.Vector3().subVectors(camera.position, anchor);
          if (dir.lengthSq() < 1e-6) dir.set(1, 0.4, 1);
          dir.normalize();
          f.toPos.copy(anchor).addScaledVector(dir, f.followDist);
          f.toTarget.copy(anchor);
          f.lastAnchorPos.copy(anchor);
        }
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
      return;
    }

    // ── persistent follow phase: translate the camera rig with the anchor ──
    if (f.persistFollow && f.anchorId && controls) {
      const anchor = getObjectPosition(f.anchorId);
      if (anchor) {
        const drift = new THREE.Vector3().subVectors(anchor, f.lastAnchorPos);
        if (drift.lengthSq() > 1e-10) {
          camera.position.add(drift);
          controls.target.copy(anchor);
          f.lastAnchorPos.copy(anchor);
          controls.update();
        }
      }
    }
  });

  return null;
}
