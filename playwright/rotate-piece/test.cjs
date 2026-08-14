// Adds a cabinet, rotates it 90° with R, and verifies both the visual
// output and the underlying store state.
//
// Background: rotatePiecesBy used to add the angle to BOTH the piece's
// Y rotation AND every component's Y rotation. Because the components
// are children of the piece's <group>, the piece rotation is already
// applied through the scene graph — the extra component rotation was
// effectively doubled, warping the piece at 90°/270° (while happening
// to look correct at 0°/180° because the doubled rotation wraps to 0).
// The test pins the correct behavior: only the piece rotation changes;
// component rotations are preserved as their template-defined values.
//
// This test also transitively pins the R-key conflict fix: R used to
// fly the camera up while rotating, and the resulting frame-timing-
// dependent camera drift made run-to-run self-diffs land at 3–4%
// (previously worked around with a 4.5% threshold — misdiagnosed as
// "GPU rasterization variance"). With camera-up moved to Space/C the
// render is byte-identical between runs, so the default 2% threshold
// applies again.

module.exports = {
  name: 'rotate-piece',
  description: 'Add a cabinet and rotate it 90° with the R key',
  action: async (page, app) => {
    await app.addPiece(page, { template: 'cabinet' });
    await page.waitForTimeout(500);

    // Snapshot component rotations BEFORE the rotation press. After the
    // press they must be identical — the rotation should not mutate
    // component rotations, only the piece's own rotation.
    const before = await page.evaluate(() => {
      const s = window.__store.getState();
      const piece = s.project.pieces[0];
      return {
        pieceRot: piece.rotation[1],
        compRots: piece.components.map((c) => c.name + ':' + c.rotation[1].toFixed(6)),
      };
    });
    if (Math.abs(before.pieceRot) > 0.001) {
      throw new Error(`Initial piece rotation should be 0, got ${before.pieceRot}`);
    }

    // Press R to rotate the selected piece 90° around Y axis
    await page.keyboard.press('r');
    await page.waitForTimeout(500);

    const after = await page.evaluate(() => {
      const s = window.__store.getState();
      const piece = s.project.pieces[0];
      return {
        pieceRot: piece.rotation[1],
        compRots: piece.components.map((c) => c.name + ':' + c.rotation[1].toFixed(6)),
      };
    });

    // Piece must have rotated by exactly 90° (= π/2 rad)
    const expected = Math.PI / 2;
    if (Math.abs(after.pieceRot - expected) > 0.001) {
      throw new Error(`After R, piece.rotation[1] should be ~${expected.toFixed(4)}, got ${after.pieceRot.toFixed(4)}`);
    }

    // Every component rotation must be unchanged
    for (let i = 0; i < before.compRots.length; i++) {
      if (before.compRots[i] !== after.compRots[i]) {
        throw new Error(`Component rotation changed during rotatePiecesBy: ${before.compRots[i]} → ${after.compRots[i]}`);
      }
    }

    // Position must not have changed (the cabinet stays at its origin)
    const pos = await page.evaluate(() => {
      const s = window.__store.getState();
      return s.project.pieces[0].position;
    });
    if (pos[0] !== 0 || pos[1] !== 0 || pos[2] !== -1300) {
      throw new Error(`Rotation must not change position; got [${pos.join(', ')}]`);
    }

    // Wait for the scene to re-render after the rotation change
    await page.waitForTimeout(1500);
  },
};
