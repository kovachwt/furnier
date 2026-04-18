// Tests the piece search / filter feature in the PieceList sidebar.
// Adds three pieces, selects one, then types a search query that
// should filter the list to show only matching pieces.

module.exports = {
  name: 'piece-search',
  description: 'Search/filter pieces in the PieceList sidebar',
  viewport: { width: 1280, height: 900 },
  action: async (page, app) => {
    // Helper to switch to the Add tab
    const switchToAdd = async () => {
      await page.evaluate(() => {
        const tabs = Array.from(document.querySelectorAll('.tab'));
        const addTab = tabs.find((t) => t.textContent.includes('Add'));
        addTab?.click();
      });
      await page.waitForTimeout(200);
    };

    // Add three different pieces
    await switchToAdd();
    await app.addPiece(page, { template: 'cabinet' });

    await switchToAdd();
    await app.addPiece(page, { template: 'bookshelf' });

    await switchToAdd();
    await app.addPiece(page, { template: 'desk' });

    // Give the scene time to settle after adding pieces
    await page.waitForTimeout(1000);

    // Switch to the edit tab to show the piece list
    await page.evaluate(() => {
      const tabs = Array.from(document.querySelectorAll('.tab'));
      const editTab = tabs.find((t) => t.textContent.includes('Edit'));
      editTab?.click();
    });
    await page.waitForTimeout(300);

    // Select the first piece (cabinet) so the list has a selected item
    const pieces = await page.$$('.piece-item');
    if (pieces.length > 0) {
      await pieces[0].click();
      await page.waitForTimeout(300);
    }

    // Type a search query that should filter to only "desk"
    await page.fill('.piece-search-input', 'desk');
    await page.waitForTimeout(500);
  },
};
