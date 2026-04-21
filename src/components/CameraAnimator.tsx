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
    // Reset tracking refs when camera/controls change (e.g. after canvas remount)
    // or when the window resizes (orientation change, split-screen, etc).
    // Without this, clicking the same preset button again won't trigger an animation
    // because the store values haven't changed and the refs still match them.
    lastPreset.current = '';
    lastCameraTarget.current = null;

    const resetTracking = () => {
      lastPreset.current = '';
      lastCameraTarget.current = null;
    };

    const unsub = useStore.subscribe((s) => {
      const targetKey = s.cameraTarget
        ? `${s.cameraTarget.position.join(',')}-${s.cameraTarget.target.join(',')}`
        : null;
      if (s.activeCameraPreset !== lastPreset.current || targetKey !== lastCameraTarget.current) {
        if (s.cameraTarget && controls) {
          startPos.current.copy(camera.position);
          startTarget.current.copy(controls.target);
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
  }, [camera, controls]);

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
