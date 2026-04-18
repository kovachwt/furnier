module.exports = {
  name: 'mobile-layout',
  description:
    'Narrow-viewport mobile layout: bottom-sheet collapsed, mobile controls hidden ' +
    '(no selection), toolbar compact, viewport full-width.',
  // Simulate a phone viewport
  viewport: { width: 375, height: 812 },
  action: async (page, app) => {
    // The app starts empty on mobile. We just verify it renders
    // with the bottom-sheet collapsed and the toolbar in compact form.
    // No piece selected → mobile controls should be hidden.
    await page.waitForTimeout(500);
  },
};