// Align-pieces test.
//
// Adds 3 cabinets at different X positions, selects all of them,
// aligns their X centers, and verifies their X positions are now
// equal (within snap tolerance).
//
// The store action `alignPieces(ids, 'x', 'center')` sets every
// selected piece's X position so that their AABB X centers all match
// the combined AABB X center. After this:
//   - piece 0, piece 1, piece 2 all have the same world X position
//
// This test reads the actual X positions from the Edit-tab inputs to
// confirm alignment happened, rather than relying on a screenshot
// diff.

module.exports = {
  name: 'align-pieces',
  description: 'Align X centers of 3 cabinets \u2014 all should end up at the same X',
  action: async (page, app) => {
    // Three cabinets at different X positions
    await app.addPiece(page, { template: 'cabinet' });                  // X = 0
    await page.waitForTimeout(300);
    await app.addPiece(page, { template: 'cabinet' });                  // X = 0 (default)
    await page.waitForTimeout(300);
    await app.addPiece(page, { template: 'cabinet' });                  // X = 0
    await page.waitForTimeout(300);

    // Move cabinets 1 and 2 to different X positions
    await app.selectPieces(page, [1]);
    await page.waitForTimeout(200);
    await page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll('.form-row'));
      const row = rows.find((r) => (r.querySelector('label')?.textContent || '').includes('X (mm)'));
      const input = row?.querySelector('input[type="number"]');
      if (!input) return;
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      setter.call(input, '400');
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
      if (!input) return;
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      setter.call(input, '800');
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await page.waitForTimeout(300);

    // Select all 3 cabinets
    await app.selectPieces(page, [0, 1, 2]);
    await page.waitForTimeout(300);

    // Click X / center align
    await app.clickAlign(page, 'X', 'center');
    await page.waitForTimeout(500);

    // Read all piece X positions. After align, all should be ~400 (the
    // average of 0, 400, 800). Tolerance is generous to allow for
    // rounding.
    const positions = await page.evaluate(() => {
      // Read from the store via a synthetic probe: the only public
      // handle is the piece list with no positions, so instead we read
      // the X (mm) input as we cycle through each selected piece.
      // We use the global window if the store exposed itself, else
      // we can read from localStorage.
      try {
        const saved = localStorage.getItem('furniture-designer-project');
        if (!saved) return [];
        const project = JSON.parse(saved);
        return project.pieces.map((p) => p.position[0]);
      } catch {
        return [];
      }
    });
    if (positions.length !== 3) {
      throw new Error(`Expected 3 pieces, got ${positions.length}`);
    }
    const target = positions[0];
    for (let i = 1; i < positions.length; i++) {
      if (Math.abs(positions[i] - target) > 1) {
        throw new Error(
          `After align, piece ${i} X should be ~${target} (got ${positions[i]}); all: ${JSON.stringify(positions)}`
        );
      }
    }
    // All X centers should be at 400 (the average of 0, 400, 800).
    // The piece position equals its center for a non-rotated cabinet,
    // so the X position should be ~400.
    if (Math.abs(target - 400) > 1) {
      throw new Error(
        `Expected aligned X = 400 (mean of 0, 400, 800), got ${target}; positions: ${JSON.stringify(positions)}`
      );
    }
  },
};
