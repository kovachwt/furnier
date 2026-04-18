import { useFrame, useThree } from '@react-three/fiber';
import { useStore } from '../store/useStore';
import { captureCanvas } from '../utils/screenshot';

/**
 * R3F component inside the Canvas that watches for a capture request
 * (set via store.takeScreenshot()) and renders one extra frame before
 * saving the canvas to a PNG download.
 */
export function ViewportCapture() {
  const { gl, scene, camera } = useThree();
  const shouldCapture = useStore((s) => s.shouldCaptureViewport);

  useFrame(() => {
    if (!shouldCapture) return;

    // Clear the flag immediately so rapid clicks are debounced.
    useStore.getState().setShouldCaptureViewport(false);

    // Render one extra frame to ensure the latest state is drawn.
    gl.render(scene, camera);

    // Capture after the extra frame paints.
    requestAnimationFrame(() => {
      const projectName = useStore.getState().project.name;
      captureCanvas(gl.domElement, projectName);
    });
  }, 1); // Priority 1 — runs before the main render pass

  return null;
}
