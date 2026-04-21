// Reproduces the bug: camera preset buttons don't work after DECREASING window width.
// The existing test resizes back before clicking, which masks the issue.

const FRONT_PRESET_POSITION = [0, 1.5, 6];
const FRONT_PRESET_TARGET = [0, 1, 0];
const TOLERANCE = 0.2;

module.exports = {
  name: 'camera-shrink-preset',
  description: 'Camera preset buttons should work after shrinking window width',
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
    await page.waitForTimeout(800);

    // Verify first click worked
    const state1 = await page.evaluate(() => {
      const state = window.__r3fState;
      return {
        position: state.camera.position.toArray(),
        target: state.controls.target.toArray(),
      };
    });
    for (let i = 0; i < 3; i++) {
      const diff = Math.abs(state1.position[i] - FRONT_PRESET_POSITION[i]);
      if (diff > TOLERANCE) throw new Error(`Initial preset failed at axis ${i}`);
    }

    // Orbit the camera manually so we can tell if the next preset click animates
    await page.evaluate(() => {
      const state = window.__r3fState;
      state.camera.position.set(5, 5, 5);
      state.controls.target.set(1, 1, 1);
      state.controls.update();
    });
    await page.waitForTimeout(200);

    // DECREASE width (this is the key step)
    await page.setViewportSize({ width: 640, height: 900 });
    await page.waitForTimeout(500);

    // Click Front preset again WITHOUT resizing back
    const clicked2 = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('.camera-preset-btn'));
      const target = btns.find((b) => b.title === 'Front');
      if (!target) return false;
      target.click();
      return true;
    });
    if (!clicked2) throw new Error('Could not find Front camera preset button after shrink');
    await page.waitForTimeout(800);

    // Verify camera position matches Front preset
    const state2 = await page.evaluate(() => {
      const state = window.__r3fState;
      return {
        position: state.camera.position.toArray(),
        target: state.controls.target.toArray(),
      };
    });

    for (let i = 0; i < 3; i++) {
      const diff = Math.abs(state2.position[i] - FRONT_PRESET_POSITION[i]);
      if (diff > TOLERANCE) {
        throw new Error(
          `After shrink: Camera position axis ${['x','y','z'][i]} is wrong. ` +
          `Expected ~${FRONT_PRESET_POSITION[i]}, got ${state2.position[i].toFixed(4)} (diff: ${diff.toFixed(4)})`
        );
      }
    }

    for (let i = 0; i < 3; i++) {
      const diff = Math.abs(state2.target[i] - FRONT_PRESET_TARGET[i]);
      if (diff > TOLERANCE) {
        throw new Error(
          `After shrink: Camera target axis ${['x','y','z'][i]} is wrong. ` +
          `Expected ~${FRONT_PRESET_TARGET[i]}, got ${state2.target[i].toFixed(4)} (diff: ${diff.toFixed(4)})`
        );
      }
    }
  },
};
