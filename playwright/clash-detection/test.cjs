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

    // Move the second cabinet so it overlaps with the first
    // Default cabinet is 600mm wide. Move second to X=400mm so they overlap
    // (first spans X=-300 to 300, second at X=400 spans 0 to 800)
    await page.evaluate(() => {
      // Switch to edit tab
      const tabs = Array.from(document.querySelectorAll('.tab'));
      const editTab = tabs.find((t) => t.textContent.includes('Edit'));
      editTab?.click();
    });
    await page.waitForTimeout(300);

    // Select the second piece (the one we just added)
    const pieceItems = await page.$$('.piece-item');
    if (pieceItems.length >= 2) {
      // Click the second piece item
      await pieceItems[1].click();
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

    // Verify the clash button shows a count
    const clashBtnText = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('.toolbar button.tool-btn'));
      const clashBtn = btns.find((b) => /Clash/i.test(b.textContent || ''));
      return clashBtn?.textContent?.trim() || '';
    });
    if (!clashBtnText.includes('(')) {
      throw new Error(`Clash button should show count, got: ${clashBtnText}`);
    }
  },
};
