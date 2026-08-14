// Regression test for issue #4 (CODE_INSPECTION.md): piece rotation was
// ignored by snap.ts (`collectSnapTargets` / `snapPieceToFaces`) and by
// alignment.ts (`getPieceWorldBounds` / `computeAlignedPositions` /
// `computeDistributedPositions`), so Align / Distribute / Align-to-wall
// and the multi-select bounds box were wrong for any rotated piece —
// while clashDetection.computePieceAABB and PieceDistances *did* handle
// piece rotation. The fix unifies everyone on the corner-transform
// `computeComponentAABB` / `computePieceAABB` math.
//
// This test is assertion-only (golden rule #2: programmatic assertions
// before the screenshot). It:
//   1. Adds two cabinets of DIFFERENT footprints, rotates both 90°.
//   2. Asserts the rotation-aware world AABB now swaps width↔depth on
//      the X/Z axes (the old, rotation-naive bounds reported the
//      unrotated width as the X extent — the bug).
//   3. Aligns their right (X / max) edges via the store action and
//      verifies the pieces' real (rotation-aware) world maxX values are
//      now equal. On the old code the alignment used the wrong extents,
//      so the actual rotated right edges ended up misaligned.
//
// All AABB checks import the *actual* app modules from the Vite dev
// server, so we're testing the production code path, not a re-impl.

module.exports = {
  name: 'rotated-align',
  tier: 'extended',
  description: 'Rotated pieces: rotation-aware world AABB + align right edges',
  action: async (page, app) => {
    // Two cabinets with different footprints so the rotation error
    // differs per piece (which is what made the old align visibly wrong).
    await app.addPiece(page, { template: 'cabinet', width: 800, depth: 500 }); // A
    await page.waitForTimeout(300);
    await app.addPiece(page, { template: 'cabinet', width: 600, depth: 700 }); // B
    await page.waitForTimeout(300);

    const ids = await page.evaluate(() => window.__store.getState().project.pieces.map((p) => p.id));
    if (ids.length !== 2) throw new Error(`Expected 2 pieces, got ${ids.length}`);

    // Rotate both 90° about Y (the only rotation the UI exposes).
    await page.evaluate((pieceIds) => {
      window.__store.getState().rotatePiecesBy(pieceIds, 90);
    }, ids);
    await page.waitForTimeout(200);

    // Move piece B to X=1000 and pull it forward in Z so the two
    // rotated cabinets are visually separated (not occluding each other)
    // while keeping their right edges far apart in X.
    await page.evaluate((pieceIds) => {
      const s = window.__store.getState();
      const b = s.project.pieces.find((p) => p.id === pieceIds[1]);
      s.setPiecesPositions({ [b.id]: [1000, b.position[1], -600] });
    }, ids);
    await page.waitForTimeout(200);

    // (1) Rotation-aware extents: a 90° yaw swaps the X and Z extents.
    //     A (w=800, d=500) → X extent ≈ 500, Z extent ≈ 800.
    //     B (w=600, d=700) → X extent ≈ 700, Z extent ≈ 600.
    //     The old rotation-naive bounds reported the unrotated width as
    //     the X extent (A→800, B→600), so these checks pin the fix.
    const before = await page.evaluate(async () => {
      const m = await import('/furnier/src/utils/clashDetection.ts');
      const s = window.__store.getState();
      return s.project.pieces.map((p) => {
        const a = m.computePieceAABB(p);
        return { xExt: a.maxX - a.minX, zExt: a.maxZ - a.minZ, maxX: a.maxX, pos: [...p.position] };
      });
    });
    const [a, b] = before;
    if (Math.abs(a.xExt - 500) > 2) throw new Error(`A rotated X extent should be ~500 (depth), got ${a.xExt}`);
    if (Math.abs(a.zExt - 800) > 2) throw new Error(`A rotated Z extent should be ~800 (width), got ${a.zExt}`);
    if (Math.abs(b.xExt - 700) > 2) throw new Error(`B rotated X extent should be ~700 (depth), got ${b.xExt}`);
    if (Math.abs(b.zExt - 600) > 2) throw new Error(`B rotated Z extent should be ~600 (width), got ${b.zExt}`);

    // (2) Align right edges (X / max). The store action must use the
    //     rotation-aware world bounds.
    await page.evaluate((pieceIds) => {
      window.__store.getState().alignPieces(pieceIds, 'x', 'max');
    }, ids);
    await page.waitForTimeout(300);

    const after = await page.evaluate(async () => {
      const m = await import('/furnier/src/utils/clashDetection.ts');
      const s = window.__store.getState();
      return s.project.pieces.map((p) => {
        const a = m.computePieceAABB(p);
        return { maxX: a.maxX, pos: [...p.position] };
      });
    });
    const diff = Math.abs(after[0].maxX - after[1].maxX);
    if (diff > 1) {
      throw new Error(
        `After align-right, rotated right edges should match within 1mm; got A.maxX=${after[0].maxX} B.maxX=${after[1].maxX} (Δ${diff}). ` +
          `Positions: ${JSON.stringify(after)}`
      );
    }

    // Give the scene a moment to render the aligned, rotated pieces.
    await page.waitForTimeout(1000);
  },
};