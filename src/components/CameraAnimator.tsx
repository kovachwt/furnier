import { useRef, useEffect } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { useStore } from '../store/useStore';
import * as THREE from 'three';

export function CameraAnimator() {
  const camera = useThree((s) => s.camera);
  const controls = useThree((s) => s.controls) as unknown as {
    target: THREE.Vector3;
    update: () => void;
  } | null;

  // Keep live refs so the Zustand subscription (which is set up once)
  // always sees the current camera / controls even if React hasn't
  // re-run the effect after a resize / remount.
  const cameraRef = useRef(camera);
  const controlsRef = useRef(controls);
  cameraRef.current = camera;
  controlsRef.current = controls;

  // Animation state
  const startPos = useRef(new THREE.Vector3());
  const startTarget = useRef(new THREE.Vector3());
  const endPos = useRef(new THREE.Vector3());
  const endTarget = useRef(new THREE.Vector3());
  const progress = useRef(0);
  const animating = useRef(false);
  const duration = useRef(0.4); // seconds

  // Listen for store changes to start animation
  const lastPreset = useRef(useStore.getState().activeCameraPreset);
  const lastCameraTarget = useRef<string | null>(null);

  useEffect(() => {
    // Reset tracking refs when the effect runs (mount or camera/controls change).
    // Without this, clicking the same preset button again won't trigger an animation
    // because the store values haven't changed and the refs still match them.
    lastPreset.current = '';
    lastCameraTarget.current = null;

    const resetTracking = () => {
      lastPreset.current = '';
      lastCameraTarget.current = null;
    };

    const unsub = useStore.subscribe((s) => {
      const cam = cameraRef.current;
      const ctrl = controlsRef.current;
      if (!cam || !ctrl) return;

      const targetKey = s.cameraTarget
        ? `${s.cameraTarget.position.join(',')}-${s.cameraTarget.target.join(',')}`
        : null;
      if (s.activeCameraPreset !== lastPreset.current || targetKey !== lastCameraTarget.current) {
        if (s.cameraTarget) {
          startPos.current.copy(cam.position);
          startTarget.current.copy(ctrl.target);
          endPos.current.set(...s.cameraTarget.position);
          endTarget.current.set(...s.cameraTarget.target);
          progress.current = 0;
          animating.current = true;
          lastPreset.current = s.activeCameraPreset;
          lastCameraTarget.current = targetKey;
        }
      }
    });

    window.addEventListener('resize', resetTracking);
    return () => {
      unsub();
      window.removeEventListener('resize', resetTracking);
    };
    // We intentionally omit camera/controls from the dependency array.
    // The subscription uses refs above, so it always sees the latest
    // instances without tearing down and recreating the listener.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Expose camera/controls to window for visual test assertions
  useEffect(() => {
    (window as unknown as Record<string, unknown>).__r3fState = { camera, controls };
  }, [camera, controls]);

  useFrame((_, delta) => {
    if (!animating.current || !controls) return;

    progress.current += delta / duration.current;
    if (progress.current >= 1) {
      progress.current = 1;
      animating.current = false;
    }

    // Ease out cubic
    const t = 1 - Math.pow(1 - progress.current, 3);

    camera.position.lerpVectors(startPos.current, endPos.current, t);
    controls.target.lerpVectors(startTarget.current, endTarget.current, t);
    controls.update();
  });

  return null;
}
