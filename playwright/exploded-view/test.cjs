// Adds a cabinet and then enables the exploded assembly view.
// Covers: the explode toggle + slider in the toolbar, the exploded
// group animation stabilizing at its target offset, drei <Text>
// labels rendering in the 3D scene.

module.exports = {
  name: 'exploded-view',
  description: 'Cabinet + exploded view enabled',
  action: async (page, app) => {
    await app.addPiece(page, { template: 'cabinet' });
    await app.clickToolbarButton(page, 'Explode');
    // Explode animation eases to target — wait longer than a single
    // scene settle so the offsets reach their stable value.
    await page.waitForTimeout(2500);
  },
};
