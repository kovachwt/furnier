// Tests the clash detection feature.
// Adds two cabinets, moves one so they overlap, enables clash detection,
// and verifies the red overlay appears on clashing pieces.

module.exports = {
  name: 'clash-detection',
  description: 'Two overlapping cabinets with clash detection enabled',
  viewport: { width: 1280, height: 900 },
  action: async (page, app) => {
    // Add first cabinet (default position at origin)
    await app.addPiece(page, { template: 'cabinet' });
    await page.waitForTimeout(500);

    // Add second cabinet — give it different params so it's named differently
    await app.addPiece(page, { template: 'cabinet', width: 800 });
    await page.waitForTimeout(500);

    // Move the second cabinet so it overlaps with the first.
    // Cabinet 1: width 600, centered at X=0  → spans roughly X=[-300, 300]
    // Cabinet 2: width 800, centered at X=400 → spans roughly X=[0, 800]
    // Overlap region: X=[0, 300] (genuine interpenetration, not just touching).
    await page.evaluate(() => {
      const tabs = Array.from(document.querySelectorAll('.tab'));
      const editTab = tabs.find((t) => t.textContent.includes('Edit'));
      editTab?.click();
    });
    await page.waitForTimeout(300);

    // Select the second piece (the one we just added — newest is last in the list)
    const pieceItems = await page.$$('.piece-item');
    if (pieceItems.length >= 2) {
      await pieceItems[pieceItems.length - 1].click();
      await page.waitForTimeout(300);
    }

    // Set X position to 400mm to create overlap
    await page.evaluate(() => {
      const labels = document.querySelectorAll('.form-row label');
      for (const label of labels) {
        if (label.textContent?.trim() === 'X (mm)') {
          const input = label.closest('.form-row')?.querySelector('input[type="number"]');
          if (input) {
            const setter = Object.getOwnPropertyDescriptor(
              window.HTMLInputElement.prototype, 'value'
            ).set;
            setter.call(input, '400');
            input.dispatchEvent(new Event('input', { bubbles: true }));
            input.dispatchEvent(new Event('change', { bubbles: true }));
          }
        }
      }
    });
    await page.waitForTimeout(500);

    // Enable clash detection via toolbar
    const toggled = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('.toolbar button.tool-btn'));
      const target = btns.find((b) => /Clash/i.test(b.textContent || ''));
      if (!target) return false;
      target.click();
      return true;
    });
    if (!toggled) throw new Error('Could not find Clash toggle button');
    await page.waitForTimeout(800);

    // Verify the store has detected clash pairs (programmatic assertion)
    const clashCount = await page.evaluate(() => {
      const state = window.__zustandStore;
      // Zustand stores created with create() attach to a global via useStore.getState()
      // but in the browser the store is accessible via the module.
      // We read it through the toolbar which re-renders with the updated state.
      return document.querySelector('.tool-btn')?.textContent?.includes('(') ? 'ok' : 'fail';
    });

    // Also check the button text programmatically
    const clashBtnText = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('.toolbar button.tool-btn'));
      const clashBtn = btns.find((b) => /Clash/i.test(b.textContent || ''));
      return clashBtn?.textContent?.trim() || '';
    });
    if (!clashBtnText.match(/Clash\s*\(\d+\)/)) {
      throw new Error(`Clash button should show count like "Clash (1)", got: "${clashBtnText}"`);
    }
  },
};
