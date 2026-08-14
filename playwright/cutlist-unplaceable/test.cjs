// Tests that panels which cannot be placed on any sheet are surfaced in the
// Cut List modal instead of silently vanishing.
//
// Background (CODE_INSPECTION.md issue #1): guillotinePack used to break out
// of its loop with only a console.warn when a panel couldn't be placed, so the
// panel appeared in NEITHER `layouts` NOR `unplaceable` — it vanished from the
// cut list, sheet counts and PDF with zero user-visible warning.
// findSheetOverflow also ignored grainDirection: a 400×2200mm panel on the
// grain-locked Oak Melamine sheet (2800×2070) passed the "fits rotated" check
// even though the packer is forbidden from rotating it.
//
// The test pins three things:
//  1. A fittable panel produces NO warning boxes (no false positives).
//  2. A grain-blocked oversized panel shows BOTH the sheet-overflow warning
//     and the "could not place" warning in the modal.
//  3. The sheet layout section reports zero sheets for the unplaceable panel.

module.exports = {
  name: 'cutlist-unplaceable',
  tier: 'core',
  description: 'Cut list modal warns about grain-blocked oversized panels instead of dropping them',
  viewport: { width: 1280, height: 900 },
  action: async (page, app) => {
    await app.addPiece(page, { template: 'panel' });
    await page.waitForTimeout(400);

    // Switch the panel to grain-locked Oak Melamine 18 (2800×2070 sheet).
    // A single-panel piece has exactly one panel component.
    const ids = await page.evaluate(() => {
      const s = window.__store.getState();
      const p = s.project.pieces[0];
      return { pieceId: p.id, compId: p.components[0].id };
    });
    await page.evaluate(({ pieceId, compId }) => {
      const s = window.__store.getState();
      s.updateComponent(pieceId, compId, { materialId: 'melamine-oak-18' });
    }, ids);

    const openCutList = async () => {
      await page.evaluate(() => {
        const btn = Array.from(document.querySelectorAll('button'))
          .find((b) => (b.textContent || '').includes('Cut List & Parts'));
        if (!btn) throw new Error('Cut List button not found');
        btn.click();
      });
      await page.waitForTimeout(400);
    };

    // ── Phase 1: fittable panel → no warnings at all ──
    await openCutList();
    const cleanWarnings = await page.evaluate(() =>
      document.querySelectorAll('.cutlist-modal .warning-box').length
    );
    if (cleanWarnings !== 0) {
      throw new Error(`Fittable panel should produce no warnings, got ${cleanWarnings}`);
    }
    // Close the modal before mutating the panel.
    await page.evaluate(() => {
      const btn = document.querySelector('.cutlist-modal .btn-close');
      if (!btn) throw new Error('Cut list close button not found');
      btn.click();
    });
    await page.waitForTimeout(200);

    // ── Phase 2: resize to 400×2200 — too tall for the 2070mm grain-locked
    // sheet, and rotation is forbidden, so it must be reported unplaceable. ──
    await page.evaluate(({ pieceId, compId }) => {
      const s = window.__store.getState();
      s.updateComponent(pieceId, compId, { width: 400, height: 2200 });
    }, ids);

    await openCutList();
    const modalText = await page.evaluate(() => {
      const modal = document.querySelector('.cutlist-modal');
      if (!modal) throw new Error('Cut list modal did not open');
      return modal.textContent || '';
    });

    if (!/too large for material sheet size/i.test(modalText)) {
      throw new Error('Sheet-overflow warning missing from cut list modal');
    }
    if (!/Could not place 1 panels/i.test(modalText)) {
      throw new Error('"Could not place" warning missing — panel would silently vanish from the cut list');
    }
    if (!/400×2200mm/.test(modalText)) {
      throw new Error('Unplaceable panel dimensions not shown in warnings');
    }

    // The unplaceable panel must not produce any sheet layouts.
    const sheetsHeading = await page.evaluate(() => {
      const h = Array.from(document.querySelectorAll('.cutlist-modal h3'))
        .find((x) => /Sheet Layouts/.test(x.textContent || ''));
      return h ? h.textContent : '';
    });
    if (!/Sheet Layouts \(0 sheets\)/.test(sheetsHeading)) {
      throw new Error(`Expected "Sheet Layouts (0 sheets)", got: "${sheetsHeading}"`);
    }

    // Let the modal render fully before the screenshot.
    await page.waitForTimeout(600);
  },
};
