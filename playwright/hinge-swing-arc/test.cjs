// Tests hinge swing-arc visualization.
// Adds a door-cabinet (auto-generates concealed hinges with swing fields),
// ensures the piece is selected (so arcs render), and verifies the hinges
// carry the new swingDirection / doorWidth fields before screenshotting.

module.exports = {
  name: 'hinge-swing-arc',
  tier: 'core',
  description: 'Door cabinet with hinge swing arcs visible (piece selected)',
  viewport: { width: 1280, height: 900 },
  action: async (page, app) => {
    // Add a door-cabinet — template populates hinges with swing fields.
    await app.addPiece(page, { template: 'door-cabinet' });
    await page.waitForTimeout(500);

    // The piece is selected after addPiece (AddFurniture calls setSelection).
    // Verify via the piece list that exactly one piece is present and selected.
    const selectedCount = await page.evaluate(() => {
      const items = Array.from(document.querySelectorAll('.piece-item'));
      const selected = items.filter(i => i.classList.contains('selected')).length;
      return { total: items.length, selected };
    });
    if (selectedCount.total !== 1) throw new Error(`Expected 1 piece, got ${selectedCount.total}`);
    if (selectedCount.selected !== 1) throw new Error('Door cabinet should be selected after add');

    // Verify the component list shows hinges and that the hinge DOM editor
    // exposes the swing field once a hinge is selected.
    const hingeCount = await page.evaluate(() => {
      const items = Array.from(document.querySelectorAll('.component-item .comp-type'));
      return items.filter(i => (i.textContent || '').trim() === 'hinge').length;
    });
    if (hingeCount < 2) throw new Error(`Expected at least 2 hinges, got ${hingeCount}`);

    // Click the first hinge component to open its editor and confirm the
    // Swing select is present (proves the new fields are wired through).
    await page.evaluate(() => {
      const items = Array.from(document.querySelectorAll('.component-item'));
      const hinge = items.find(i => (i.querySelector('.comp-type')?.textContent || '').trim() === 'hinge');
      if (!hinge) throw new Error('No hinge component item to click');
      hinge.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    await page.waitForTimeout(200);

    const hasSwingSelect = await page.evaluate(() => {
      const editor = document.querySelector('.comp-editor');
      if (!editor) return false;
      const labels = Array.from(editor.querySelectorAll('label'));
      return labels.some(l => (l.textContent || '').trim() === 'Swing');
    });
    if (!hasSwingSelect) throw new Error('Hinge editor should expose a Swing field');

    // Deselect the component so the piece (not a sub-component) is the
    // selection — arcs render based on isPieceSelected, which is true
    // whenever the piece is selected regardless of component selection,
    // but switching back to piece-level keeps the gizmo out of the shot.
    await page.evaluate(() => {
      const items = Array.from(document.querySelectorAll('.piece-item'));
      items[0]?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    await page.waitForTimeout(400);
  },
};
