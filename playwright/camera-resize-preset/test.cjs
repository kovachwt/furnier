// Tests that camera preset buttons work correctly after a window resize.
// 1. Adds a cabinet, clicks Front preset.
// 2. Resizes to half width (simulating user window resize).
// 3. Clicks Front preset again.
// 4. Verifies the camera position matches the expected Front preset position [0, 1.5, 6] with target [0, 1, 0].

const FRONT_PRESET_POSITION = [0, 1.5, 6];
const FRONT_PRESET_TARGET = [0, 1, 0];
const TOLERANCE = 0.2; // 20cm in world units

module.exports = {
  name: 'camera-resize-preset',
  description: 'Camera preset buttons should work after window resize',
  viewport: { width: 1280, height: 900 },
  action: async (page, app) => {
    // Add a cabinet
    await app.addPiece(page, { template: 'cabinet' });

    // Click the "Front" camera preset button
    const clicked1 = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('.camera-preset-btn'));
      const target = btns.find((b) => b.title === 'Front');
      if (!target) return false;
      target.click();
      return true;
    });
    if (!clicked1) throw new Error('Could not find Front camera preset button');

    // Wait for animation to complete
    await page.waitForTimeout(800);

    // Now resize the viewport to half width (simulating user window resize)
    await page.setViewportSize({ width: 640, height: 900 });
    await page.waitForTimeout(500);

    // Resize back to the original size (simulating coming back from landscape/resize)
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.waitForTimeout(500);

    // Click the Front preset button again
    const clicked2 = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('.camera-preset-btn'));
      const target = btns.find((b) => b.title === 'Front');
      if (!target) return false;
      target.click();
      return true;
    });
    if (!clicked2) throw new Error('Could not find Front camera preset button (after resize)');

    // Wait for animation to complete
    await page.waitForTimeout(800);

    // Verify the camera position matches the expected Front preset position
    const cameraState = await page.evaluate(() => {
      const state = window.__r3fState;
      if (!state || !state.camera || !state.controls) {
        return { error: 'R3F state not available' };
      }
      return {
        position: state.camera.position.toArray(),
        target: state.controls.target.toArray(),
      };
    });

    if (cameraState.error) {
      throw new Error(cameraState.error);
    }

    // Check camera position
    for (let i = 0; i < 3; i++) {
      const diff = Math.abs(cameraState.position[i] - FRONT_PRESET_POSITION[i]);
      if (diff > TOLERANCE) {
        throw new Error(
          `Camera position axis ${['x', 'y', 'z'][i]} is wrong. ` +
          `Expected ~${FRONT_PRESET_POSITION[i]}, got ${cameraState.position[i].toFixed(4)} (diff: ${diff.toFixed(4)})`
        );
      }
    }

    // Check camera target
    for (let i = 0; i < 3; i++) {
      const diff = Math.abs(cameraState.target[i] - FRONT_PRESET_TARGET[i]);
      if (diff > TOLERANCE) {
        throw new Error(
          `Camera target axis ${['x', 'y', 'z'][i]} is wrong. ` +
          `Expected ~${FRONT_PRESET_TARGET[i]}, got ${cameraState.target[i].toFixed(4)} (diff: ${diff.toFixed(4)})`
        );
      }
    }

    // Also verify the active preset is 'front' by checking the button's active class
    const activePresetButton = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('.camera-preset-btn'));
      const frontBtn = btns.find((b) => b.title === 'Front');
      return frontBtn?.classList.contains('active') ?? null;
    });
    if (!activePresetButton) {
      throw new Error('Front preset button is not marked as active');
    }
  },
};
