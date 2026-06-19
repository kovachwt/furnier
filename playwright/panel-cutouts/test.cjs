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
  },
};
