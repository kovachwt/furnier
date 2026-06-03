// Align-to-wall test.
//
// Adds 3 cabinets scattered around the room, selects them, aligns
// them to the back wall, and verifies their back-edge Z values
// all match the room's back wall Z (which is -room.depth/2 = -1500).

module.exports = {
  name: 'align-to-wall',
  description: 'Align 3 pieces to the back wall \u2014 all back-edges at Z = -1500',
  action: async (page, app) => {
    // Three cabinets at default (Z=0)
    await app.addPiece(page, { template: 'cabinet' });
    await page.waitForTimeout(300);
    await app.addPiece(page, { template: 'cabinet' });
    await page.waitForTimeout(300);
    await app.addPiece(page, { template: 'cabinet' });
    await page.waitForTimeout(300);

    // Spread them along Z so we have something to align
    await app.selectPieces(page, [0]);
    await page.waitForTimeout(200);
    await page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll('.form-row'));
      const row = rows.find((r) => (r.querySelector('label')?.textContent || '').includes('Z (mm)'));
      const input = row?.querySelector('input[type="number"]');
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      setter.call(input, '200');
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await page.waitForTimeout(300);

    await app.selectPieces(page, [1]);
    await page.waitForTimeout(200);
    await page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll('.form-row'));
      const row = rows.find((r) => (r.querySelector('label')?.textContent || '').includes('Z (mm)'));
      const input = row?.querySelector('input[type="number"]');
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      setter.call(input, '600');
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await page.waitForTimeout(300);

    // Select all and align to back wall
    await app.selectPieces(page, [0, 1, 2]);
    await page.waitForTimeout(300);

    await app.clickAlignToWall(page, 'back');
    await page.waitForTimeout(500);

    // After aligning to back wall, all cabinets should have the
    // same back-edge Z. The back wall is at -1500 (room.depth=3000
    // means back wall at -1500). The cabinet is 400mm deep, so
    // its back face (the side closer to the back wall) should
    // touch Z=-1500, meaning its position Z = -1500 + 200 = -1300.
    // (Cabinet components are positioned with origin at the center.)
    const positions = await page.evaluate(() => {
      try {
        const saved = localStorage.getItem('furniture-designer-project');
        if (!saved) return [];
        const project = JSON.parse(saved);
        return project.pieces.map((p) => p.position[2]).sort((a, b) => a - b);
      } catch {
        return [];
      }
    });
    if (positions.length !== 3) {
      throw new Error(`Expected 3 pieces, got ${positions.length}`);
    }
    // All Z values should be equal (each cabinet's back-edge on the wall)
    const z0 = positions[0];
    for (let i = 1; i < positions.length; i++) {
      if (Math.abs(positions[i] - z0) > 1) {
        throw new Error(
          `After align-to-back, all pieces should share the same Z. Got: ${JSON.stringify(positions)}`
        );
      }
    }
    // And the value should be -1300 (back wall -1500 + half-depth 200)
    if (Math.abs(z0 - (-1300)) > 1) {
      throw new Error(
        `After align-to-back, Z should be ~-1300 (back wall -1500 + half-depth 200), got ${z0}`
      );
    }
  },
};
