// Distribute-pieces test.
//
// Adds 3 cabinets at clustered X positions, distributes them evenly
// along X, and verifies the resulting spacing is uniform.
//
// The store action `distributePieces(ids, 'x')` sets each piece's X
// so its X center is at first + i*step, where first/last are the
// outermost centers and step = (last-first)/(n-1).

module.exports = {
  name: 'distribute-pieces',
  description: 'Distribute 3 cabinets evenly along X axis',
  action: async (page, app) => {
    // Add 3 cabinets (all default X=0)
    await app.addPiece(page, { template: 'cabinet' });
    await page.waitForTimeout(300);
    await app.addPiece(page, { template: 'cabinet' });
    await page.waitForTimeout(300);
    await app.addPiece(page, { template: 'cabinet' });
    await page.waitForTimeout(300);

    // Stagger them so the centers are at distinct X values
    await app.selectPieces(page, [0]);
    await page.waitForTimeout(200);
    await page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll('.form-row'));
      const row = rows.find((r) => (r.querySelector('label')?.textContent || '').includes('X (mm)'));
      const input = row?.querySelector('input[type="number"]');
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      setter.call(input, '0');
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await page.waitForTimeout(300);

    await app.selectPieces(page, [1]);
    await page.waitForTimeout(200);
    await page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll('.form-row'));
      const row = rows.find((r) => (r.querySelector('label')?.textContent || '').includes('X (mm)'));
      const input = row?.querySelector('input[type="number"]');
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      setter.call(input, '100');
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await page.waitForTimeout(300);

    await app.selectPieces(page, [2]);
    await page.waitForTimeout(200);
    await page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll('.form-row'));
      const row = rows.find((r) => (r.querySelector('label')?.textContent || '').includes('X (mm)'));
      const input = row?.querySelector('input[type="number"]');
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      setter.call(input, '110');
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await page.waitForTimeout(300);

    // Now select all and distribute along X
    await app.selectPieces(page, [0, 1, 2]);
    await page.waitForTimeout(300);

    await app.clickDistribute(page, 'x');
    await page.waitForTimeout(500);

    // Verify the three positions are evenly spaced
    const positions = await page.evaluate(() => {
      try {
        const saved = localStorage.getItem('furniture-designer-project');
        if (!saved) return [];
        const project = JSON.parse(saved);
        return project.pieces.map((p) => p.position[0]).sort((a, b) => a - b);
      } catch {
        return [];
      }
    });
    if (positions.length !== 3) {
      throw new Error(`Expected 3 pieces, got ${positions.length}`);
    }
    const step1 = positions[1] - positions[0];
    const step2 = positions[2] - positions[1];
    if (Math.abs(step1 - step2) > 1) {
      throw new Error(
        `Distribution should produce equal spacing. Steps: ${step1}, ${step2}; positions: ${JSON.stringify(positions)}`
      );
    }
  },
};
