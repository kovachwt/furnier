// Multi-select test.
//
// Adds 3 pieces, shift-clicks all 3 in the piece list
// to build a multi-selection, and verifies the AlignmentPanel is
// rendered and the correct pieces are in the selection.
//
// The alignment panel only appears when 2+ pieces are selected, so
// its presence is the canonical "multi-select is working" signal.

module.exports = {
  name: 'multi-select',
  tier: 'extended', // 3 addPiece() calls; ~15s
  description: 'Three pieces selected via shift+click \u2014 alignment panel visible',
  action: async (page, app) => {
    // Three cabinets in a row at different positions
    await app.addPiece(page, { template: 'cabinet' });
    await page.waitForTimeout(300);
    await app.addPiece(page, { template: 'cabinet' });
    await page.waitForTimeout(300);
    await app.addPiece(page, { template: 'cabinet' });
    await page.waitForTimeout(300);

    // Select all 3 (first click clears, subsequent shift-click adds)
    await app.selectPieces(page, [0, 1, 2]);

    // Verify alignment panel is now visible (only renders for 2+)
    const state = await app.readState(page);
    if (!state.alignmentPanelVisible) {
      throw new Error('Alignment panel should be visible with 2+ pieces selected');
    }

    // Verify the badge shows "3" (3 selected)
    const badgeText = await page.evaluate(() => {
      // The first .multi-badge is in the PieceList (count of selected)
      const badges = Array.from(document.querySelectorAll('.multi-badge'));
      return badges[0]?.textContent?.trim() || '';
    });
    if (badgeText !== '3 selected') {
      throw new Error(`Multi-select badge should show "3 selected", got "${badgeText}"`);
    }
  },
};
