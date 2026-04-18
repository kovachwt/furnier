module.exports = {
  name: 'mobile-controls',
  description:
    'Narrow viewport with a piece selected: mobile nudge controls visible, ' +
    'bottom sheet open showing piece list.',
  viewport: { width: 375, height: 812 },
  action: async (page, app) => {
    // Add a cabinet so there's something selected
    await app.addPiece(page, { template: 'cabinet' });

    // Open the bottom sheet by clicking the Edit tab
    await app.switchToEditTab(page);
    await page.waitForTimeout(300);

    // Click the bottom-sheet handle to open it (on mobile the sidebar
    // becomes a bottom-sheet with a toggling handle button)
    const opened = await page.evaluate(() => {
      const handle = document.querySelector('.bottom-sheet-handle');
      if (handle) { handle.click(); return true; }
      // Desktop sidebar exists — just return false
      return false;
    });
    if (opened) await page.waitForTimeout(400);
  },
};