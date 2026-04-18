// Adds a cabinet and toggles the "Thick" panel thickness exaggeration.
// Covers: the showThickness store state, the toolbar toggle, and the
// visual result of exaggerated panel depth in the 3D viewport.

module.exports = {
  name: 'thick-panels',
  description: 'Add a cabinet and enable panel thickness exaggeration',
  action: async (page, app) => {
    await app.addPiece(page, { template: 'cabinet' });
    // Click the "Thick" toggle button in the toolbar
    await app.clickToolbarButton(page, 'Thick');
    await page.waitForTimeout(1500);
  },
};
