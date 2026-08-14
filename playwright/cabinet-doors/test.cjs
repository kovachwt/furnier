// Regression test for issues #7 + #8 (CODE_INSPECTION.md):
//
// #7 — Two-door cabinet handles were mounted on the HINGE (outer)
//      edges: `[-(doorW + 1), …]` / `[+(doorW + 1), …]` put the knobs
//      on the cabinet's outer sides — ergonomically the worst spot and
//      sticking out past the carcass. Fix: knobs go on the INNER edges
//      (the gap side), inset 30 mm from the 2 mm center gap, mirroring
//      the single-door cabinet's `innerW/2 - 30` inset.
//
// #8 — The plain `cabinet` (open) template exposed a "Doors" number
//      input in PieceEditor that `createCabinet` never read, so
//      changing it (or regenerating with Doors=2) did nothing. The
//      real door handling lives in the separate `door-cabinet`
//      template. Fix: remove the dead control for `templateType ===
//      'cabinet'`.
//
// Assertion-first (golden rule #2). We:
//   1. Add a 2-door `door-cabinet` and verify, via the store, that:
//        - the 2 handles sit on the inner edges (|x| ≈ 31 mm, near the
//          center gap), NOT on the hinge edges (|x| ≈ innerW/2 − 17);
//        - the 4 hinges remain on the outer edges (unchanged by the fix);
//        - the left handle is on the negative-x side, right on positive.
//        This pins #7: on the old code the handles matched the hinge
//        x-extent (±(doorW+1)) and failed every check here.
//   2. Add a plain `cabinet` and verify:
//        - the Edit panel renders NO "Doors" form-row (the dead control
//          is gone — pins #8);
//        - the piece from `createCabinet` has zero hinge/handle
//          components regardless of `templateParams.doors` (i.e. the
//          param is genuinely inert for the open cabinet).
//
// The trailing screenshot also serves as the visual baseline for the
// corrected two-door handle placement.

module.exports = {
  name: 'cabinet-doors',
  tier: 'extended',
  description: 'Two-door cabinet handles on inner edges (#7) + no dead Doors control on plain cabinet (#8)',
  action: async (page, app) => {
    // --- (1) Two-door cabinet: handle placement ---
    await app.addPiece(page, {
      template: 'door-cabinet',
      width: 800,
      height: 900,
      depth: 400,
      shelves: 0,
      doors: 2,
    });
    // Pull the door-cabinet to the left so it doesn't stack on top of
    // the second piece (templates default to [0,0,0]). The store path
    // also auto-selects it, so the Edit tab inspects the right piece.
    await page.evaluate(() => {
      const s = window.__store.getState();
      const id = s.selectedPieceId;
      if (id) s.setPiecesPositions({ [id]: [-700, 0, 0] });
    });
    await page.waitForTimeout(200);
    await app.switchToEditTab(page);

    const doorCheck = await page.evaluate(() => {
      const s = window.__store.getState();
      const p = s.project.pieces.find((x) => x.templateType === 'door-cabinet');
      if (!p) throw new Error('door-cabinet piece not found');
      const handles = p.components.filter((c) => c.type === 'handle');
      const hinges = p.components.filter((c) => c.type === 'hinge');
      if (handles.length !== 2) throw new Error(`expected 2 handles, got ${handles.length}`);
      if (hinges.length !== 4) throw new Error(`expected 4 hinges, got ${hinges.length}`);

      // Sort handles by x so [0] = left, [1] = right.
      const sortedHandles = [...handles].sort((a, b) => a.position[0] - b.position[0]);
      const leftHandle = sortedHandles[0].position[0];
      const rightHandle = sortedHandles[1].position[0];

      // Sort hinges by x; outer-left = min, outer-right = max.
      const hingeXs = hinges.map((h) => h.position[0]).sort((a, b) => a - b);
      const leftHingeX = hingeXs[0];
      const rightHingeX = hingeXs[hingeXs.length - 1];

      // door-cabinet: width 800, default material (melamine-white-16) t=16
      // → innerW = 768, doorW = innerW/2 - 1 = 383.
      // Inner edges of the two doors sit at x = ∓1 (2 mm gap).
      // Fixed handle position = ∓(1 + 30) = ∓31.
      const EXPECT = 31; // |x| of each handle, mm
      // Hinges: ∓(innerW/2 - 17) = ∓(384 - 17) = ∓367.
      const EXPECT_HINGE = 367;

      return { leftHandle, rightHandle, leftHingeX, rightHingeX, EXPECT, EXPECT_HINGE };
    });

    // Left handle on the negative (left/inner) side, right on positive.
    if (doorCheck.leftHandle >= 0) throw new Error(`left handle x should be negative, got ${doorCheck.leftHandle}`);
    if (doorCheck.rightHandle <= 0) throw new Error(`right handle x should be positive, got ${doorCheck.rightHandle}`);

    // Handles sit on the INNER edges (~∓31 mm), not the hinge edges.
    if (Math.abs(Math.abs(doorCheck.leftHandle) - doorCheck.EXPECT) > 1)
      throw new Error(`left handle |x| should be ~${doorCheck.EXPECT}, got ${doorCheck.leftHandle}`);
    if (Math.abs(Math.abs(doorCheck.rightHandle) - doorCheck.EXPECT) > 1)
      throw new Error(`right handle |x| should be ~${doorCheck.EXPECT}, got ${doorCheck.rightHandle}`);

    // Handles must NOT be on the hinge edges (the old buggy placement).
    // Old code put them at ∓(doorW + 1) = ∓382, essentially coincident
    // with the hinge x. Assert handles are well inboard of the hinges.
    if (Math.abs(doorCheck.leftHandle) >= Math.abs(doorCheck.leftHingeX) - 50)
      throw new Error(
        `left handle should be inboard of left hinge; handle=${doorCheck.leftHandle} hinge=${doorCheck.leftHingeX}`
      );
    if (Math.abs(doorCheck.rightHandle) >= Math.abs(doorCheck.rightHingeX) - 50)
      throw new Error(
        `right handle should be inboard of right hinge; handle=${doorCheck.rightHandle} hinge=${doorCheck.rightHingeX}`
      );

    // Hinges are unchanged by the fix — still on the outer edges.
    if (Math.abs(Math.abs(doorCheck.leftHingeX) - doorCheck.EXPECT_HINGE) > 1)
      throw new Error(`left hinge |x| should be ~${doorCheck.EXPECT_HINGE}, got ${doorCheck.leftHingeX}`);
    if (Math.abs(Math.abs(doorCheck.rightHingeX) - doorCheck.EXPECT_HINGE) > 1)
      throw new Error(`right hinge |x| should be ~${doorCheck.EXPECT_HINGE}, got ${doorCheck.rightHingeX}`);

    // --- (2) Plain cabinet: no dead "Doors" control, doors param inert ---
    await app.addPiece(page, { template: 'cabinet', width: 600, height: 720, depth: 400, shelves: 2 });
    // Place the open cabinet to the right of the door-cabinet for a
    // clear, non-overlapping screenshot.
    await page.evaluate(() => {
      const s = window.__store.getState();
      const id = s.selectedPieceId;
      if (id) s.setPiecesPositions({ [id]: [700, 0, 0] });
    });
    await page.waitForTimeout(200);
    await app.switchToEditTab(page);

    // Ensure the plain cabinet is the selected piece (it auto-selects on
    // add, but be defensive) — find the cabinet piece id and select it
    // via the list if needed.
    const selectedType = await page.evaluate(() => {
      const s = window.__store.getState();
      const p = s.project.pieces.find((x) => x.id === s.selectedPieceId);
      return p ? p.templateType : null;
    });
    if (selectedType !== 'cabinet') {
      // The cabinet is the second piece in the list (0 = door-cabinet,
      // 1 = cabinet).
      await app.clickPiece(page, 1);
      await page.waitForTimeout(150);
    }

    // (2a) Edit panel must NOT render a "Doors" form-row for the open
    //      cabinet. This is the direct pin for #8.
    const hasDoorsRow = await page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll('.form-row'));
      return rows.some((r) => (r.querySelector('label')?.textContent || '').trim() === 'Doors');
    });
    if (hasDoorsRow) throw new Error('plain cabinet editor should NOT show a Doors control (#8)');

    // (2b) createCabinet ignores doors entirely: even if the persisted
    //      templateParams carried doors=2, the open cabinet must have
    //      zero hinges and zero handles (just panels). Also force the
    //      stored doors param to 2 and regenerate, then re-check, so we
    //      prove the param is inert rather than just absent.
    const inertCheck = await page.evaluate(() => {
      const s = window.__store.getState();
      let p = s.project.pieces.find((x) => x.templateType === 'cabinet');
      if (!p) throw new Error('plain cabinet not found');
      // regeneratePiece takes the params explicitly (it does NOT read
      // piece.templateParams). Stash the originals, force doors:2,
      // regenerate, then prove createCabinet ignored it.
      const origParams = { ...p.templateParams };
      const forcedParams = { ...origParams, doors: 2 };
      s.regeneratePiece(p.id, forcedParams);
      p = s.project.pieces.find((x) => x.templateType === 'cabinet');
      const compTypes = p.components.map((c) => c.type);
      const hasHinge = compTypes.includes('hinge');
      const hasHandle = compTypes.includes('handle');
      const hasDoorPanel = p.components.some((c) => c.type === 'panel' && /door/i.test(c.name));
      // Restore original params + regenerate to leave state clean.
      s.regeneratePiece(p.id, origParams);
      return { hasHinge, hasHandle, hasDoorPanel };
    });
    if (inertCheck.hasHinge) throw new Error('open cabinet must have no hinges (doors param inert)');
    if (inertCheck.hasHandle) throw new Error('open cabinet must have no handles (doors param inert)');
    if (inertCheck.hasDoorPanel) throw new Error('open cabinet must have no door panels (doors param inert)');

    // Let the scene settle before the screenshot.
    await page.waitForTimeout(800);
  },
};