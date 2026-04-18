// Tests the handle component type.
// Adds a door-cabinet (which auto-generates handles) and verifies
// the handles are present in the component list.

module.exports = {
  name: 'handle-component',
  description: 'Door cabinet with auto-generated handles renders correctly',
  viewport: { width: 1280, height: 900 },
  action: async (page, app) => {
    // Add a door-cabinet (includes handles in template)
    await app.addPiece(page, { template: 'door-cabinet' });

    // Wait for scene to settle
    await page.waitForTimeout(500);

    // Verify handles appear in the component list
    const hasHandles = await page.evaluate(() => {
      const items = document.querySelectorAll('.component-item .comp-type');
      return Array.from(items).some(item => item.textContent?.trim() === 'handle');
    });
    if (!hasHandles) throw new Error('Door cabinet should have handle components');
  },
};
