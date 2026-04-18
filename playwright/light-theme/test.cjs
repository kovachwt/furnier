// Tests the light theme toggle.
// Adds a cabinet, toggles to light theme, then screenshots to verify
// the UI switches from dark to light colors correctly.

module.exports = {
  name: 'light-theme',
  description: 'Light theme toggle changes UI colors from dark to light',
  viewport: { width: 1280, height: 900 },
  action: async (page, app) => {
    // Add a cabinet to populate the viewport
    await app.addPiece(page, { template: 'cabinet' });

    // Toggle to light theme
    await app.toggleTheme(page);

    // Verify the light class is applied to the document element
    const isLight = await page.evaluate(() =>
      document.documentElement.classList.contains('light')
    );
    if (!isLight) throw new Error('Light theme class not applied to document element');

    // Wait for any CSS transitions to settle
    await page.waitForTimeout(300);
  },
};
