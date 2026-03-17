import { useRef, useEffect } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const MOVE_SPEED = 3;     // world units/s (≈3 m/s in scene scale)
const ORBIT_SPEED = 1.5;  // radians/s
const VERTICAL_SPEED = 2; // world units/s

export function KeyboardCameraControls() {
  const pressedKeys = useRef<Set<string>>(new Set());
  const camera = useThree((s) => s.camera);
  // OrbitControls is stored via makeDefault
  const controls = useThree((s) => s.controls) as unknown as {
    target: THREE.Vector3;
    update: () => void;
  } | null;

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      pressedKeys.current.add(e.key.toLowerCase());
    };
    const onKeyUp = (e: KeyboardEvent) => {
      pressedKeys.current.delete(e.key.toLowerCase());
    };
    // Clear all keys when window loses focus to prevent stuck keys
    const onBlur = () => { pressedKeys.current.clear(); };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
    };
  }, []);

  useFrame((_, delta) => {
    const keys = pressedKeys.current;
    if (keys.size === 0 || !controls) return;

    // Camera forward direction projected onto XZ plane
    const forward = new THREE.Vector3();
    camera.getWorldDirection(forward);
    forward.y = 0;
    forward.normalize();

    // Right vector (perpendicular to forward on XZ plane)
    const right = new THREE.Vector3();
    right.crossVectors(forward, camera.up).normalize();

    const move = MOVE_SPEED * delta;
    const translation = new THREE.Vector3();

    // WASD: translate camera + target together
    if (keys.has('w')) translation.addScaledVector(forward, move);
    if (keys.has('s')) translation.addScaledVector(forward, -move);
    if (keys.has('a')) translation.addScaledVector(right, -move);
    if (keys.has('d')) translation.addScaledVector(right, move);

    // R/F: vertical movement
    if (keys.has('r')) translation.y += VERTICAL_SPEED * delta;
    if (keys.has('f')) translation.y -= VERTICAL_SPEED * delta;

    if (translation.lengthSq() > 0) {
      camera.position.add(translation);
      controls.target.add(translation);
    }

    // Q/E: orbit camera around target (azimuthal rotation)
    const orbiting = keys.has('q') || keys.has('e');
    if (orbiting) {
      const angle = ORBIT_SPEED * delta * (keys.has('q') ? 1 : -1);
      const offset = camera.position.clone().sub(controls.target);
      offset.applyAxisAngle(new THREE.Vector3(0, 1, 0), angle);
      camera.position.copy(controls.target).add(offset);
    }

    controls.update();
  });

  return null;
}
