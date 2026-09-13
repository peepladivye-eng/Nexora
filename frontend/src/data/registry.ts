/**
 * ORBITGUARD – object registry
 * Module-level singleton map of live world positions for planets and
 * satellites. Scene components write positions each frame; the camera
 * director, conjunction scene and debris layers read them. Avoids
 * prop-drilling or per-frame React state.
 */
import * as THREE from 'three';

const positions = new Map<string, THREE.Vector3>();

/** Reserve a slot for an object (idempotent). */
export function registerObject(id: string): void {
  if (!positions.has(id)) positions.set(id, new THREE.Vector3());
}

/** Copy a live world position into the registry (no allocation). */
export function setObjectPosition(id: string, v: THREE.Vector3): void {
  const entry = positions.get(id);
  if (entry) entry.copy(v);
}

/** Read a live position (or undefined if not yet registered). */
export function getObjectPosition(id: string): THREE.Vector3 | undefined {
  return positions.get(id);
}

/** Shared flag: true while the camera director is flying. */
export const directorBusy = { busy: false };
