// Tests undo and redo functionality.
//
// 1. Start with an empty room.
// 2. Add two cabinets.
// 3. Undo once — verify one cabinet remains.
// 4. Undo again — verify room is empty.
// 5. Redo once — verify one cabinet appears.
// 6. Redo again — verify two cabinets appear.

const SCENE_SETTLE_MS = 2500;

const countPieces = async (page) => {
  return page.evaluate(() => document.querySelectorAll('.piece-item').length);
};

module.exports = {
  name: 'undo-redo',
  description: 'Undo removes a piece, redo restores it (Ctrl+Z / Ctrl+Y)',
  action: async (page, app) => {
    // Step 1: empty room (already in this state from openApp)

    // Step 2: add two cabinets
    await app.addPiece(page, { template: 'cabinet' });
    await app.addPiece(page, { template: 'cabinet' });

    let count = await countPieces(page);
    if (count !== 2) {
      throw new Error(`Expected 2 pieces after adding two cabinets, got ${count}`);
    }

    // Step 3: Undo (Ctrl+Z) — should remove the second cabinet
    await page.keyboard.press('Control+z');
    await page.waitForTimeout(SCENE_SETTLE_MS);

    count = await countPieces(page);
    if (count !== 1) {
      throw new Error(`Expected 1 piece after first undo, got ${count}`);
    }

    // Step 4: Undo again — should remove the first cabinet, room is empty
    await page.keyboard.press('Control+z');
    await page.waitForTimeout(SCENE_SETTLE_MS);

    count = await countPieces(page);
    if (count !== 0) {
      throw new Error(`Expected 0 pieces after second undo, got ${count}`);
    }

    // Step 5: Redo (Ctrl+Y) — should bring back one cabinet
    await page.keyboard.press('Control+y');
    await page.waitForTimeout(SCENE_SETTLE_MS);

    count = await countPieces(page);
    if (count !== 1) {
      throw new Error(`Expected 1 piece after first redo, got ${count}`);
    }

    // Step 6: Redo again — should bring back the second cabinet
    await page.keyboard.press('Control+y');
    await page.waitForTimeout(SCENE_SETTLE_MS);

    count = await countPieces(page);
    if (count !== 2) {
      throw new Error(`Expected 2 pieces after second redo, got ${count}`);
    }
  },
};