// Tests the camera preset buttons in the toolbar.
// Adds a cabinet, then clicks the "Front" preset button to move
// the camera to a front-facing view.

module.exports = {
  name: 'camera-presets',
  description: 'Camera preset buttons animate the view to Front/Top/Side/Iso',
  viewport: { width: 1280, height: 900 },
  action: async (page, app) => {
    // Add a cabinet
    await app.addPiece(page, { template: 'cabinet' });

    // Click the "Front" camera preset button (⊡ icon)
    const clicked = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('.camera-preset-btn'));
      const target = btns.find((b) => b.title === 'Front');
      if (!target) return false;
      target.click();
      return true;
    });
    if (!clicked) throw new Error('Could not find Front camera preset button');

    // Wait for animation to complete
    await page.waitForTimeout(600);
  },
};
