// Tests that dragging a multi-piece selection pushes exactly ONE undo entry,
// and that a single Ctrl+Z restores every selected piece to its pre-drag
// position.
//
// Background (CODE_INSPECTION.md issue #2): the group-drag loop in
// FurniturePieceMesh.handleDrag called setPiecesPositions on every pointer
// move, and setPiecesPositions unconditionally pushed history — a single
// 2-second drag created dozens of history entries (stack cap 50), making
// Ctrl+Z nearly useless. The fix routes the drag loop through
// setPiecesPositions(pos, { skipHistory: true }); handleDragEnd pushes the
// single entry, exactly like single-piece drags already did.
//
// The test drives the REAL gizmo with real mouse events: two panels are
// multi-selected, the camera is parked on the Front preset, and the primary
// piece's gizmo is projected to screen coordinates using the live camera
// matrices (window.__r3fState) so the XY plane-slider handle can be grabbed.
//
// Pins four things:
//  1. The group drag moves BOTH pieces (the drag actually happened).
//  2. History grows by exactly 1 per drag (was: 1 per pointermove).
//  3. ONE Ctrl+Z restores BOTH pieces to their exact pre-drag positions.
//  4. setPiecesPositions without opts still pushes history (align/distribute
//     remain undoable) while { skipHistory: true } does not.

// Project a world point through a three.js camera (column-major matrices).
function projectPoint(cam, p) {
  const apply = (m, v) => [
    m[0] * v[0] + m[4] * v[1] + m[8] * v[2] + m[12],
    m[1] * v[0] + m[5] * v[1] + m[9] * v[2] + m[13],
    m[2] * v[0] + m[6] * v[1] + m[10] * v[2] + m[14],
    m[3] * v[0] + m[7] * v[1] + m[11] * v[2] + m[15],
  ];
  const eye = apply(cam.inv, p);
  const clip = apply(cam.proj, eye);
  return [clip[0] / clip[3], clip[1] / clip[3]]; // NDC
}

module.exports = {
  name: 'group-drag-undo',
  tier: 'core',
  description: 'Multi-piece gizmo drag creates a single undo entry; one Ctrl+Z reverts both pieces',
  action: async (page, app) => {
    // Two small panels (300x200mm) so the gizmo handles stick out well past
    // the body and the plane slider is grabbable without hitting geometry.
    await app.addPiece(page, { template: 'panel', width: 300, height: 200 });
    await page.waitForTimeout(300);
    await app.addPiece(page, { template: 'panel', width: 300, height: 200 });
    await page.waitForTimeout(300);

    // Park piece B 1500mm to the right (updatePiece pushes no history) so the
    // two pieces don't overlap and can't face-snap onto each other mid-drag.
    const ids = await page.evaluate(() => {
      const s = window.__store.getState();
      return s.project.pieces.map((p) => p.id);
    });
    if (ids.length !== 2) throw new Error(`Expected 2 pieces, got ${ids.length}`);
    await page.evaluate((id) => {
      const s = window.__store.getState();
      const p = s.project.pieces.find((x) => x.id === id);
      s.updatePiece(id, { position: [1500, p.position[1], p.position[2]] });
      // Snapshot the move so a later undo stops HERE, not before it
      // (updatePiece itself pushes no history — same as a UI drag,
      // which pushes only on dragEnd).
      window.__store.getState().pushHistory();
    }, ids[1]);

    // Multi-select: piece 0 becomes the primary and owns the gizmo.
    await app.selectPieces(page, [0, 1]);

    // Park the camera on the Front preset so screen coords are deterministic.
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('.camera-preset-btn'))
        .find((b) => b.title === 'Front');
      if (!btn) throw new Error('Front camera preset button not found');
      btn.click();
    });
    await page.waitForTimeout(1000); // animation is 0.4s — let it fully settle

    // Live camera + canvas rect, then project the primary's gizmo center.
    const setup = await page.evaluate(() => {
      const s = window.__store.getState();
      const { camera } = window.__r3fState;
      const primaryId = s.selectedPieceIds[0];
      const primary = s.project.pieces.find((p) => p.id === primaryId);
      const rect = document.querySelector('canvas').getBoundingClientRect();
      return {
        primaryId,
        selectionSize: s.selectedPieceIds.length,
        // gizmo anchor = bbox center = the single panel's local center
        centerMm: [
          primary.position[0] + primary.components[0].position[0],
          primary.position[1] + primary.components[0].position[1],
          primary.position[2] + primary.components[0].position[2],
        ],
        camPos: camera.position.toArray(),
        camTarget: window.__r3fState.controls.target.toArray(),
        inv: Array.from(camera.matrixWorldInverse.elements),
        proj: Array.from(camera.projectionMatrix.elements),
        rect: { left: rect.left, top: rect.top, width: rect.width, height: rect.height },
      };
    });

    if (setup.selectionSize !== 2) throw new Error(`Expected multi-selection of 2, got ${setup.selectionSize}`);
    // Sanity: the Front preset must have finished animating.
    if (Math.abs(setup.camPos[0]) > 0.01 || Math.abs(setup.camPos[1] - 1.5) > 0.01 || Math.abs(setup.camPos[2] - 6) > 0.01) {
      throw new Error(`Camera not at Front preset: ${setup.camPos.join(',')}`);
    }

    const world = setup.centerMm.map((v) => v * 0.001); // mm → world (S = 0.001)
    const [ndcX, ndcY] = projectPoint({ inv: setup.inv, proj: setup.proj }, world);
    const cx = setup.rect.left + (ndcX * 0.5 + 0.5) * setup.rect.width;
    const cy = setup.rect.top + (1 - (ndcY * 0.5 + 0.5)) * setup.rect.height;

    // Snapshot before the drag.
    const before = await page.evaluate(() => {
      const s = window.__store.getState();
      return {
        historyLen: s.history.length,
        positions: s.project.pieces.map((p) => [...p.position]),
      };
    });

    // --- Real gizmo drag: grab the XY plane slider (the square in the +X/+Y
    // quadrant of the gizmo, ~12px up-right of center) and pull right. ---
    const startX = cx + 12;
    const startY = cy - 12;
    await page.mouse.move(startX, startY);
    await page.waitForTimeout(100);
    await page.mouse.down();
    // 8 pointermove steps — with the old bug this pushed 8 history entries.
    for (let i = 1; i <= 8; i++) {
      await page.mouse.move(startX + i * 15, startY);
      await page.waitForTimeout(60);
    }
    await page.mouse.up();
    await page.waitForTimeout(400);

    const after = await page.evaluate(() => {
      const s = window.__store.getState();
      return {
        historyLen: s.history.length,
        positions: s.project.pieces.map((p) => [...p.position]),
      };
    });

    // 1. The drag must have actually happened and moved BOTH pieces.
    const d0 = after.positions[0][0] - before.positions[0][0];
    const d1 = after.positions[1][0] - before.positions[1][0];
    if (d0 < 500 || d0 > 1500) throw new Error(`Primary piece moved ${d0}mm — gizmo drag didn't land (expected ~1000mm +X)`);
    if (Math.abs(d1 - d0) > 1) throw new Error(`Group drag moved pieces differently: ${d0}mm vs ${d1}mm`);

    // 2. Exactly ONE history entry for the whole drag.
    if (after.historyLen !== before.historyLen + 1) {
      throw new Error(`Group drag pushed ${after.historyLen - before.historyLen} history entries (expected exactly 1)`);
    }

    // 3. One Ctrl+Z restores BOTH pieces to their exact pre-drag positions.
    await page.keyboard.press('Control+z');
    await page.waitForTimeout(300);
    const undone = await page.evaluate(() =>
      window.__store.getState().project.pieces.map((p) => [...p.position])
    );
    for (let i = 0; i < 2; i++) {
      for (let axis = 0; axis < 3; axis++) {
        if (undone[i][axis] !== before.positions[i][axis]) {
          throw new Error(`After single undo, piece ${i} axis ${axis} is ${undone[i][axis]}, expected ${before.positions[i][axis]} (pre-drag)`);
        }
      }
    }

    // 4. Store contract: default setPiecesPositions pushes history (align /
    // distribute depend on this), skipHistory does not. Note: after an undo,
    // a push truncates the redo tail first, so track historyIndex (which must
    // advance by exactly 1) alongside the length — the length alone can stay
    // constant when a redo entry gets truncated.
    const contract = await page.evaluate((id) => {
      const read = () => {
        const st = window.__store.getState();
        const p = st.project.pieces.find((x) => x.id === id);
        return { len: st.history.length, idx: st.historyIndex, x: p.position[0], y: p.position[1], z: p.position[2] };
      };
      const h0 = read();
      window.__store.getState().setPiecesPositions({ [id]: [300, h0.y, h0.z] });
      const afterDefault = read();
      window.__store.getState().setPiecesPositions({ [id]: [350, afterDefault.y, afterDefault.z] }, { skipHistory: true });
      const afterSkip = read();
      return { h0, afterDefault, afterSkip };
    }, setup.primaryId);
    if (contract.afterDefault.idx !== contract.h0.idx + 1 || contract.afterDefault.len !== contract.afterDefault.idx + 1) {
      throw new Error(`setPiecesPositions (default) idx ${contract.h0.idx}→${contract.afterDefault.idx} len ${contract.h0.len}→${contract.afterDefault.len} — expected index +1 (align/distribute would lose undo)`);
    }
    if (contract.afterDefault.x !== 300) {
      throw new Error(`setPiecesPositions (default) did not move the piece: x=${contract.afterDefault.x}`);
    }
    if (contract.afterSkip.idx !== contract.afterDefault.idx || contract.afterSkip.len !== contract.afterDefault.len) {
      throw new Error(`setPiecesPositions({skipHistory:true}) changed history idx ${contract.afterDefault.idx}→${contract.afterSkip.idx} len ${contract.afterDefault.len}→${contract.afterSkip.len} — expected no change`);
    }
    if (contract.afterSkip.x !== 350) {
      throw new Error(`setPiecesPositions({skipHistory:true}) did not move the piece: x=${contract.afterSkip.x}`);
    }

    // Let the scene settle before the screenshot.
    await page.waitForTimeout(400);
  },
};
