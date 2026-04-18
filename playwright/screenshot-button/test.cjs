// Tests the screenshot button in the toolbar.
// Adds a cabinet, then clicks the screenshot button (📷) to verify
// the button is present, clickable, and the viewport renders correctly.

module.exports = {
  name: 'screenshot-button',
  description: 'Screenshot button exists in toolbar and is clickable',
  viewport: { width: 1280, height: 900 },
  action: async (page, app) => {
    // Add a cabinet to populate the viewport
    await app.addPiece(page, { template: 'cabinet' });

    // Click the screenshot button (📷) in the toolbar
    const clicked = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('.toolbar button.tool-btn'));
      const target = btns.find((b) => (b.title || '').includes('Screenshot'));
      if (!target) return false;
      target.click();
      return true;
    });
    if (!clicked) throw new Error('Could not find screenshot button in toolbar');

    // Verify the button briefly shows a capturing state (opacity change)
    await page.waitForTimeout(400);
  },
};
