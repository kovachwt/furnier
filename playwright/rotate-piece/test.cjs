// Adds a cabinet and rotates it 90° with the R key.
// Covers: the rotateSelectedPiece store action, keyboard shortcut handler,
// and the visual result of a rotated cabinet in the 3D viewport.

module.exports = {
  name: 'rotate-piece',
  description: 'Add a cabinet and rotate it 90° with the R key',
  action: async (page, app) => {
    await app.addPiece(page, { template: 'cabinet' });
    // Press R to rotate the selected piece 90° around Y axis
    await page.keyboard.press('r');
    // Wait for the scene to re-render after the rotation change
    await page.waitForTimeout(1500);
  },
};
