// Covers three viewport-interaction fixes from the code inspection
// (medium-severity batch #5 / #6 / #9):
//
// #5 — R-key conflict: App's global handler rotates the selected piece
//      on R while KeyboardCameraControls treated R as camera-up, so a
//      single keypress did BOTH (preventDefault doesn't stop sibling
//      window listeners). Camera vertical moved to Space / C; R is now
//      rotate-only. Asserted below: R rotates the piece with zero
//      camera movement, R with no selection does nothing at all, and
//      Space / C fly the camera up / down.
//
// #6 — Leg extents: PieceDistances had its own AABB math with
//      `hh = comp.height` for legs, but legs render *centered* on their
//      position (templates place them at legH/2), so every distance
//      label anchored to `aabb.max[1]` floated ~one leg-height too
//      high on legged pieces (desks). PieceDistances now reuses the
//      canonical rotation-aware computePieceAABB. Pinned with a
//      programmatic assertion: the rendered distance-label Text
//      meshes are located in the scene graph and their world Y must
//      equal piece height + 50 mm (a ~25 px shift is invisible to the
//      2% pixel threshold).
//
// #9 — Piece-level gizmo showed rotation rings that handleDrag
//      silently discarded (it only decomposes position/scale, so the
//      ring animated then snapped back). The piece-level PivotControls
//      now passes disableRotations like the component-level one.
//      Visually pinned by the updated rotate-piece baseline (rings are
//      barely visible at this test's desk scale); the disableRotations
//      prop itself is exercised by every gizmo interaction.
//
// The screenshot baseline therefore shows: a selected desk (gizmo with
// arrows, no rings) + distance labels at the correct height.

module.exports = {
  name: 'interaction-fixes',
  description: 'R rotates without flying camera (Space/C = vertical); desk distance labels at true top; ringless piece gizmo',
  viewport: { width: 1280, height: 900 },
  action: async (page, app) => {
    // Desk — the only default template with leg components (#6)
    await app.addPiece(page, { template: 'desk' });

    const pieceInfo = await page.evaluate(() => {
      const piece = window.__store.getState().project.pieces[0];
      const leg = piece.components.find((c) => c.type === 'leg');
      return { legCount: piece.components.filter((c) => c.type === 'leg').length, legH: leg?.height ?? 0 };
    });
    if (pieceInfo.legCount === 0) throw new Error('Desk template should produce leg components');
    if (!(pieceInfo.legH > 100)) throw new Error(`Desk legs should be tall (got ${pieceInfo.legH} mm) — the #6 label offset is leg-height sized`);

    // Enable distance labels. The desk stays selected after add.
    await app.toggleDistances(page);
    // Blur the toolbar button so Space (camera-up) isn't swallowed as a
    // button activation (focused buttons keep Space for a11y).
    await page.evaluate(() => document.activeElement?.blur());

    // --- #5: with a selection, R rotates the piece and does NOT move the camera ---
    const before = await page.evaluate(() => ({
      rot: window.__store.getState().project.pieces[0].rotation[1],
      camY: window.__camera.position.y,
      sel: window.__store.getState().selectedPieceId,
    }));
    if (!before.sel) throw new Error('Desk should be selected right after add');

    await page.keyboard.press('r');
    await page.waitForTimeout(250);
    const afterRotate = await page.evaluate(() => ({
      rot: window.__store.getState().project.pieces[0].rotation[1],
      camY: window.__camera.position.y,
    }));
    if (Math.abs(afterRotate.rot - before.rot - Math.PI / 2) > 0.001) {
      throw new Error(`R should rotate the piece 90°: ${before.rot} → ${afterRotate.rot}`);
    }
    if (Math.abs(afterRotate.camY - before.camY) > 1e-6) {
      throw new Error(`R must not fly the camera up (old R conflict): Δy = ${afterRotate.camY - before.camY}`);
    }

    // --- #5: with nothing selected, R does nothing at all ---
    await page.keyboard.press('Escape');
    await page.evaluate(() => document.activeElement?.blur());
    const noSel = await page.evaluate(() => window.__store.getState().selectedPieceId);
    if (noSel !== null) throw new Error('Escape should have cleared the selection');

    await page.keyboard.down('r');
    await page.waitForTimeout(400); // hold long enough that the old camera-up would move noticeably
    await page.keyboard.up('r');
    const afterRNoSel = await page.evaluate(() => ({
      rot: window.__store.getState().project.pieces[0].rotation[1],
      camY: window.__camera.position.y,
    }));
    if (Math.abs(afterRNoSel.camY - afterRotate.camY) > 1e-6) {
      throw new Error(`R must no longer move the camera (old R conflict): ${afterRotate.camY} → ${afterRNoSel.camY}`);
    }
    if (Math.abs(afterRNoSel.rot - afterRotate.rot) > 0.001) {
      throw new Error('R with no selection must not rotate anything');
    }

    // --- #5: Space / C are the new camera vertical keys ---
    await page.keyboard.down(' ');
    await page.waitForTimeout(300);
    await page.keyboard.up(' ');
    const afterSpace = await page.evaluate(() => window.__camera.position.y);
    if (afterSpace <= afterRNoSel.camY + 0.05) {
      throw new Error(`Space should fly the camera up: ${afterRNoSel.camY} → ${afterSpace}`);
    }
    await page.keyboard.down('c');
    await page.waitForTimeout(300);
    await page.keyboard.up('c');
    const afterC = await page.evaluate(() => window.__camera.position.y);
    if (afterC >= afterSpace - 0.05) {
      throw new Error(`C should fly the camera down: ${afterSpace} → ${afterC}`);
    }

    // --- #6: distance labels sit at the desk's TRUE top, not a
    // leg-height above it. Programmatic check: find the rendered
    // distance-label Text meshes (fontSize 0.03 = PieceDistances' size;
    // RoomBox's dimension labels use 0.12 and exploded-view labels only
    // exist when exploded) and assert their world Y ≈ desk height + 50 mm
    // (labels anchor at aabb.max[1] + 50). With the old doubled leg
    // extents the labels floated at ~1.5 × leg height ≈ 1.15 world units.
    const labelCheck = await page.evaluate(() => {
      const desk = window.__store.getState().project.pieces[0];
      const expectedY = (desk.templateParams.height + 50) * 0.001;
      const labels = [];
      window.__scene.traverse((o) => {
        if (typeof o.text === 'string' && o.fontSize === 0.03 && /^\d+ mm$/.test(o.text.trim())) {
          const y = o.matrixWorld.elements[13];
          labels.push({ text: o.text, y });
        }
      });
      return { expectedY, labels };
    });
    if (labelCheck.labels.length < 3) {
      throw new Error(`Expected >= 3 wall-distance labels, found ${labelCheck.labels.length}`);
    }
    for (const l of labelCheck.labels) {
      if (Math.abs(l.y - labelCheck.expectedY) > 0.015) {
        throw new Error(
          `Distance label "${l.text}" at y=${l.y.toFixed(3)} — expected ${labelCheck.expectedY.toFixed(3)} ` +
          `(piece top + 50 mm). Old doubled leg extents put labels ~0.35 too high.`
        );
      }
    }

    // --- Final state for the screenshot ---
    // Desk selected (gizmo visible), distance labels on, default view
    // restored. The screenshot pins the overall scene; the label
    // heights above are pinned programmatically (a ~25 px label shift
    // is real but far below the 2% pixel threshold).
    await app.clickPiece(page, 0);
    await page.keyboard.press('r');
    await page.keyboard.press('r');
    await page.keyboard.press('r');
    const finalRot = await page.evaluate(() => window.__store.getState().project.pieces[0].rotation[1]);
    if (Math.abs(Math.cos(finalRot) - 1) > 1e-6) {
      throw new Error(`Desk should end unrotated (mod 360°), got ${finalRot} rad`);
    }

    // Restore the exact default view (Canvas camera + OrbitControls
    // target) so the Space/C drift above can't shift the viewpoint.
    // This replaces a camera-preset click: the presets sit far outside
    // the room, which renders the distance labels too small to see.
    const restored = await page.evaluate(() => {
      if (!window.__camera || !window.__controls) return false;
      window.__camera.position.set(3, 2.5, 3);
      window.__controls.target.set(0, 1, 0);
      window.__controls.update();
      return true;
    });
    if (!restored) throw new Error('window.__camera / __controls not exposed');
    await page.waitForTimeout(800); // damping settle
  },
};
