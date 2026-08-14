// Tests panel cutouts (rect + circle holes punched through a panel).
// Adds a single-panel piece, then drives the CutoutEditor to add one
// rectangular and one circular cutout, positions them apart, and
// verifies the cutouts exist before screenshotting.

module.exports = {
  name: 'panel-cutouts',
  tier: 'core',
  description: 'Single panel with a rectangular and a circular cutout',
  viewport: { width: 1280, height: 900 },
  action: async (page, app) => {
    // Add a single panel piece (default 600×720).
    await app.addPiece(page, { template: 'panel' });
    await page.waitForTimeout(400);

    // Select the panel component so the ComponentEditor renders.
    await page.evaluate(() => {
      const item = document.querySelector('.component-item');
      if (!item) throw new Error('No component item found');
      item.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    await page.waitForTimeout(200);

    // Add a rectangular cutout and a circular cutout (in separate frames
    // so the second click doesn't land on a stale, re-rendered node).
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('.cutout-editor button.btn-secondary'));
      const rect = buttons.find(b => /Rect/.test(b.textContent || ''));
      if (!rect) throw new Error('Rect cutout button not found');
      rect.click();
    });
    await page.waitForTimeout(200);
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('.cutout-editor button.btn-secondary'));
      const circle = buttons.find(b => /Circle/.test(b.textContent || ''));
      if (!circle) throw new Error('Circle cutout button not found');
      circle.click();
    });
    await page.waitForTimeout(200);

    // Helper: set a number field inside the n-th cutout row by label.
    const setCutoutField = async (rowIndex, label, value) => {
      await page.evaluate(({ ri, l, v }) => {
        const rows = Array.from(document.querySelectorAll('.cutout-row'));
        const row = rows[ri];
        if (!row) throw new Error(`No cutout row at index ${ri}`);
        const labels = Array.from(row.querySelectorAll('label'));
        const lab = labels.find(x => (x.textContent || '').trim() === l);
        const input = lab?.closest('.form-row')?.querySelector('input');
        if (!input) throw new Error(`No input for "${l}" in row ${ri}`);
        const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        setter.call(input, String(v));
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
      }, { ri: rowIndex, l: label, v: value });
    };

    // Row 0 = rect: x=-140, w=160, h=160
    await setCutoutField(0, 'X', -140);
    await setCutoutField(0, 'Width', 160);
    await setCutoutField(0, 'Height', 160);
    // Row 1 = circle: x=140, diameter=200
    await setCutoutField(1, 'X', 140);
    await setCutoutField(1, 'Diameter', 200);

    await page.waitForTimeout(500);

    // Programmatic assertions.
    // 1. Two cutout rows rendered (one rect, one circle).
    const rowsInfo = await page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll('.cutout-row'));
      return rows.map(r => ({
        labels: Array.from(r.querySelectorAll('label')).map(l => l.textContent.trim()),
        inputs: Array.from(r.querySelectorAll('input')).map(i => i.value),
      }));
    });
    if (rowsInfo.length !== 2) throw new Error(`Expected 2 cutout rows, got ${rowsInfo.length}`);
    const hasRect = rowsInfo.some(r => r.labels.includes('Width') && r.labels.includes('Height'));
    const hasCircle = rowsInfo.some(r => r.labels.includes('Diameter'));
    if (!hasRect) throw new Error('Missing rectangular cutout (no Width/Height fields)');
    if (!hasCircle) throw new Error('Missing circular cutout (no Diameter field)');

    // 2. Values round-tripped through the store (rect X = -140, circle Diameter = 200).
    const rectRow = rowsInfo.find(r => r.labels.includes('Width'));
    const rectXIdx = rectRow.labels.indexOf('X');
    if (rectRow.inputs[rectXIdx] !== '-140') {
      throw new Error(`Rect cutout X should be -140, got ${rectRow.inputs[rectXIdx]}`);
    }
    const circleRow = rowsInfo.find(r => r.labels.includes('Diameter'));
    const circleDIdx = circleRow.labels.indexOf('Diameter');
    if (circleRow.inputs[circleDIdx] !== '200') {
      throw new Error(`Circle cutout diameter should be 200, got ${circleRow.inputs[circleDIdx]}`);
    }

    // ── Regression (CODE_INSPECTION.md issue #3): cutouts on ROTATED sheet
    // placements were drawn at the wrong position — the rotated branch used
    // the placed-height term for cx and the placed-width term for cy, so any
    // non-square rotated panel had its cutouts displaced by
    // (placedW − placedH)/2 in both axes (same bug in SVG + PDF).
    // A pixel diff can't reliably see a shifted 30px hole, so we verify the
    // drawn SVG geometry directly: force a rotated placement, read the
    // placement rect + cutout elements, and check each cutout center against
    // the rotated transform  cx = rx + rw/2 + c.y·s ,  cy = ry + rh/2 − c.x·s.
    // The panel is resized and restored via the store (updateComponent pushes
    // no history), and the modal is closed before the screenshot — the final
    // pixel state is identical to the original baseline.

    // 1. Resize to 2000×700 — the BSF packer rotates this on the default
    //    2800×2070 melamine sheet (rotated leftover 70mm beats normal 800mm).
    await page.evaluate(() => {
      const s = window.__store.getState();
      const p = s.project.pieces[0];
      s.updateComponent(p.id, p.components[0].id, { width: 2000, height: 700 });
    });

    // 2. Open the cut list modal.
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button'))
        .find((b) => (b.textContent || '').includes('Cut List & Parts'));
      if (!btn) throw new Error('Cut List button not found');
      btn.click();
    });
    await page.waitForTimeout(500);

    const geo = await page.evaluate(() => {
      const s = window.__store.getState();
      const comp = s.project.pieces[0].components[0];
      const svg = document.querySelector('.sheet-svg');
      if (!svg) throw new Error('Sheet SVG not found');
      const rects = Array.from(svg.querySelectorAll('g rect')).map((r) => ({
        x: parseFloat(r.getAttribute('x')), y: parseFloat(r.getAttribute('y')),
        w: parseFloat(r.getAttribute('width')), h: parseFloat(r.getAttribute('height')),
      }));
      return {
        cutouts: (comp.cutouts ?? []).map((c) => ({ shape: c.shape, x: c.x, y: c.y, w: c.w, h: c.h })),
        panel: { w: comp.width, h: comp.height },
        placed: rects[0],          // first rect inside the placement <g>
        cutRects: rects.slice(1),  // rectangular cutout outlines
        circles: Array.from(svg.querySelectorAll('circle')).map((c) => ({
          cx: parseFloat(c.getAttribute('cx')), cy: parseFloat(c.getAttribute('cy')),
        })),
        rotated: Array.from(svg.querySelectorAll('text')).some((t) => /↻/.test(t.textContent || '')),
      };
    });

    // 3. The placement must actually be rotated, with swapped rect dims.
    if (!geo.rotated) throw new Error('Expected the 2000×700 panel to be placed ROTATED — rotation setup failed');
    if (geo.placed.w <= 0 || geo.placed.h <= 0) throw new Error('Missing placement rect in sheet SVG');
    if (Math.abs(geo.placed.w / geo.placed.h - geo.panel.h / geo.panel.w) > 0.01) {
      throw new Error(`Rotated placement rect has wrong aspect: ${geo.placed.w}×${geo.placed.h} for panel ${geo.panel.w}×${geo.panel.h}`);
    }

    // 4. Each cutout must sit exactly where the rotated transform puts it.
    //    (The old bug displaced centers by (placedW−placedH)/2 · scale ≈ 650mm.)
    const scale = geo.placed.w / geo.panel.h; // svg units per mm (placed width = panel height when rotated)
    const ctrX = geo.placed.x + geo.placed.w / 2;
    const ctrY = geo.placed.y + geo.placed.h / 2;
    geo.cutouts.forEach((c, i) => {
      const expCx = ctrX + c.y * scale;
      const expCy = ctrY - c.x * scale;
      if (c.shape === 'circle') {
        const c2 = geo.circles[i - geo.cutouts.slice(0, i).filter((k) => k.shape !== 'circle').length];
        if (!c2) throw new Error(`Circle cutout ${i} not rendered in sheet SVG`);
        if (Math.abs(c2.cx - expCx) > 0.5 || Math.abs(c2.cy - expCy) > 0.5) {
          throw new Error(`Circle cutout ${i} at (${c2.cx.toFixed(1)}, ${c2.cy.toFixed(1)}), expected (${expCx.toFixed(1)}, ${expCy.toFixed(1)}) — rotated cutout misplaced`);
        }
      } else {
        const r2 = geo.cutRects[i - geo.cutouts.slice(0, i).filter((k) => k.shape === 'rect').length];
        if (!r2) throw new Error(`Rect cutout ${i} not rendered in sheet SVG`);
        const rcx = r2.x + r2.w / 2;
        const rcy = r2.y + r2.h / 2;
        if (Math.abs(rcx - expCx) > 0.5 || Math.abs(rcy - expCy) > 0.5) {
          throw new Error(`Rect cutout ${i} at (${rcx.toFixed(1)}, ${rcy.toFixed(1)}), expected (${expCx.toFixed(1)}, ${expCy.toFixed(1)}) — rotated cutout misplaced`);
        }
      }
    });

    // 5. Close the modal and restore the panel so the screenshot state
    //    matches the original baseline exactly.
    await page.evaluate(() => {
      const btn = document.querySelector('.cutlist-modal .btn-close');
      if (!btn) throw new Error('Cut list close button not found');
      btn.click();
      const s = window.__store.getState();
      const p = s.project.pieces[0];
      s.updateComponent(p.id, p.components[0].id, { width: 600, height: 720 });
    });
    await page.waitForTimeout(500);
  },
};
