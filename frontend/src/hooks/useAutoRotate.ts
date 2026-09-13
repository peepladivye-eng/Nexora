import { useEffect, useRef } from 'react';
import { useOrbitGuard } from '../store/orbitGuard';

const IDLE_TIMEOUT_MS = 4000;

export function useAutoRotate() {
  const controlsRef = useOrbitGuard((s) => s.controlsRef);
  const idleTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const controls = controlsRef?.current;
    if (!controls) return;

    controls.autoRotate = true;

    const disableAutoRotate = () => {
      controls.autoRotate = false;

      if (idleTimerRef.current !== null) {
        window.clearTimeout(idleTimerRef.current);
      }

      idleTimerRef.current = window.setTimeout(() => {
        controls.autoRotate = true;
      }, IDLE_TIMEOUT_MS);
    };

    const handlePointerDown = (e: PointerEvent) => {
      if (e.button !== undefined) disableAutoRotate();
    };

    const handleWheel = () => {
      disableAutoRotate();
    };

    const handlePointerMove = (e: PointerEvent) => {
      if (e.buttons > 0) disableAutoRotate();
    };

    window.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('wheel', handleWheel, { passive: true });
    window.addEventListener('pointermove', handlePointerMove);

    return () => {
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('wheel', handleWheel);
      window.removeEventListener('pointermove', handlePointerMove);

      if (idleTimerRef.current !== null) {
        window.clearTimeout(idleTimerRef.current);
      }
    };
  }, [controlsRef]);
}
