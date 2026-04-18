// Tests the floor-gap warning feature.
// Adds a desk (which has legs and should sit on the floor),
// then lifts it via the editor and verifies the ⚠ warning appears.
// Legless pieces like cabinets may be wall-mounted, so they don't get warnings.

module.exports = {
  name: 'floor-gap-warning',
  description: 'Floating pieces with legs show ⚠ warning with gap value in piece list',
  viewport: { width: 1280, height: 900 },
  action: async (page, app) => {
    // Add a desk — it has legs and sits on the floor, no warning expected
    await app.addPiece(page, { template: 'desk' });
    await page.waitForTimeout(500);

    // Verify no floating warning for a piece on the floor
    const hasInitialFloating = await page.$('.piece-item.floating');
    if (hasInitialFloating) {
      throw new Error('Desk on floor should not have floating warning');
    }

    // Switch to edit tab to show the piece list and editor
    await page.evaluate(() => {
      const tabs = Array.from(document.querySelectorAll('.tab'));
      const editTab = tabs.find((t) => t.textContent.includes('Edit'));
      editTab?.click();
    });
    await page.waitForTimeout(300);

    // Click on the desk in the piece list to select it
    const pieceItem = await page.$('.piece-item');
    if (pieceItem) {
      await pieceItem.click();
      await page.waitForTimeout(200);
    }

    // Lift the desk by setting Y position to 200mm
    // Find the Y input by its label and fill it
    await page.evaluate(() => {
      const labels = document.querySelectorAll('.form-row label');
      for (const label of labels) {
        if (label.textContent?.trim() === 'Y (mm)') {
          const input = label.closest('.form-row')?.querySelector('input[type="number"]');
          if (input) {
            // Use the native setter to ensure React picks up the change
            const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
              window.HTMLInputElement.prototype, 'value'
            ).set;
            nativeInputValueSetter.call(input, '200');
            input.dispatchEvent(new Event('input', { bubbles: true }));
            input.dispatchEvent(new Event('change', { bubbles: true }));
          }
        }
      }
    });
    await page.waitForTimeout(500);

    // Verify the floating indicator appears
    const hasFloatingIndicator = await page.$('.piece-item.floating') !== null;
    if (!hasFloatingIndicator) throw new Error('Floating piece should have .floating class');

    // Verify the ⚠ icon appears in the piece name
    const floatingItem = await page.$('.piece-item.floating');
    const floatingText = await floatingItem?.innerText();
    if (!floatingText || !floatingText.includes('⚠')) {
      throw new Error(`Floating piece should show ⚠ icon, got: ${floatingText}`);
    }

    // Verify tooltip shows gap value
    const title = await floatingItem?.getAttribute('title');
    if (!title || !title.includes('200mm')) {
      throw new Error(`Tooltip should show gap value, got: ${title}`);
    }
  },
};