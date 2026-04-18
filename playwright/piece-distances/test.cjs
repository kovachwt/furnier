// Tests the piece distances toggle.
// Adds two pieces, then enables the distance display to verify
// dimension labels appear above each piece.

module.exports = {
  name: 'piece-distances',
  description: 'Distance labels appear above pieces when Dist toggle is enabled',
  viewport: { width: 1280, height: 900 },
  action: async (page, app) => {
    // Add a cabinet
    await app.addPiece(page, { template: 'cabinet' });

    // Switch back to Add tab to add another piece
    await page.evaluate(() => {
      const tabs = Array.from(document.querySelectorAll('.tab'));
      const addTab = tabs.find((t) => t.textContent?.trim() === '+ Add');
      if (addTab) addTab.click();
    });
    await page.waitForTimeout(200);

    // Add a bookshelf to have multiple pieces
    await app.addPiece(page, { template: 'bookshelf' });

    // Enable distance display
    await app.toggleDistances(page);

    // Verify the Dist button is now active
    const isActive = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('.toolbar button.tool-btn'));
      const distBtn = btns.find((b) => /Dist/i.test(b.textContent || ''));
      return distBtn?.classList.contains('active');
    });
    if (!isActive) throw new Error('Dist toggle button should be active');
  },
};
