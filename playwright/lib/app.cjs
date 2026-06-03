// App-specific Playwright helpers for Furnier.
//
// Each helper takes the Page object and performs a semantic action
// (open the app, add a piece, toggle a tool). Keeping UI selectors
// centralized here means if the UI changes we update one file
// instead of N tests.
//
// SCENE_SETTLE_MS is the time we wait for the R3F scene to render
// and stabilize after each significant state change (page load, add
// piece). Tests that need longer (e.g. for an animation to complete)
// do their own `waitForTimeout` on top of this.

const SCENE_SETTLE_MS = 1000;

async function openApp(page, url) {
  await page.goto(url, { waitUntil: 'load', timeout: 30000 });
  // Clear any persisted project so every test starts from the default state.
  await page.evaluate(() => {
    try { localStorage.clear(); } catch {}
  });
  await page.reload({ waitUntil: 'load', timeout: 30000 });
  // Give R3F time to spin up the canvas + render a couple of frames.
  await page.waitForSelector('canvas', { timeout: 15000 });
  await page.waitForTimeout(SCENE_SETTLE_MS);
}

async function switchToAddTab(page) {
  // After adding/selecting a piece, the sidebar auto-switches to the Edit tab.
  // Click the Add tab to get back to the AddFurniture panel.
  const clicked = await page.evaluate(() => {
    const tabs = Array.from(document.querySelectorAll('.tab'));
    const addTab = tabs.find((t) => t.textContent && t.textContent.includes('Add'));
    if (!addTab) return false;
    addTab.click();
    return true;
  });
  if (!clicked) throw new Error('Could not find Add tab button');
  await page.waitForTimeout(150);
}

async function switchToEditTab(page) {
  const clicked = await page.evaluate(() => {
    const tabs = Array.from(document.querySelectorAll('.tab'));
    const editTab = tabs.find((t) => t.textContent && t.textContent.includes('Edit'));
    if (!editTab) return false;
    editTab.click();
    return true;
  });
  if (!clicked) throw new Error('Could not find Edit tab button');
  await page.waitForTimeout(150);
}

async function selectTemplate(page, value) {
  // The template <select> is in the Add panel.
  // We locate by its <option> value for robustness.
  // Make sure we're on the Add tab first.
  await switchToAddTab(page);
  await page.evaluate((v) => {
    const selects = Array.from(document.querySelectorAll('select'));
    const target = selects.find((s) => Array.from(s.options).some((o) => o.value === v));
    if (!target) throw new Error('Could not find template select with option ' + v);
    target.value = v;
    target.dispatchEvent(new Event('change', { bubbles: true }));
  }, value);
  await page.waitForTimeout(150);
}

async function clickAdd(page) {
  // The primary "Add …" button always has class "btn-primary" and its
  // label starts with "+ Add" (or "📌 Add Fixture"). Click the first
  // button matching that in the Add panel.
  const clicked = await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button.btn-primary'));
    const target = btns.find((b) => /Add/i.test(b.textContent || ''));
    if (!target) return false;
    target.click();
    return true;
  });
  if (!clicked) throw new Error('Could not find "+ Add" button');
  await page.waitForTimeout(SCENE_SETTLE_MS);
}

async function clickToolbarButton(page, labelMatcher) {
  // labelMatcher: a substring that appears in the button's visible text.
  const clicked = await page.evaluate((needle) => {
    const btns = Array.from(document.querySelectorAll('.toolbar button.tool-btn'));
    const target = btns.find((b) => (b.textContent || '').includes(needle));
    if (!target) return false;
    target.click();
    return true;
  }, labelMatcher);
  if (!clicked) throw new Error(`Could not find toolbar button matching "${labelMatcher}"`);
  await page.waitForTimeout(600);
}

async function toggleTheme(page) {
  // Click the theme toggle button (sun/moon icon) in the toolbar.
  const toggled = await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('.toolbar button.tool-btn'));
    const target = btns.find((b) => ['☀', '🌙'].includes((b.textContent || '').trim()));
    if (!target) return false;
    target.click();
    return true;
  });
  if (!toggled) throw new Error('Could not find theme toggle button');
  await page.waitForTimeout(300);
}

async function toggleDistances(page) {
  // Click the "Dist" toggle button in the toolbar.
  const toggled = await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('.toolbar button.tool-btn'));
    const target = btns.find((b) => /Dist/i.test(b.textContent || ''));
    if (!target) return false;
    target.click();
    return true;
  });
  if (!toggled) throw new Error('Could not find Dist toggle button');
  await page.waitForTimeout(600);
}

/**
 * Add a piece using one of the built-in templates, with optional
 * parameter overrides. Use for reproducible test scenarios.
 */
async function addPiece(page, { template, width, height, depth, shelves, doors, drawerRows } = {}) {
  if (template) await selectTemplate(page, template);

  const setNumber = async (labelText, value) => {
    if (value == null) return;
    await page.evaluate(({ l, v }) => {
      const rows = Array.from(document.querySelectorAll('.form-row'));
      const row = rows.find((r) => (r.querySelector('label')?.textContent || '').includes(l));
      const input = row?.querySelector('input[type="number"]');
      if (!input) return;
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      setter.call(input, String(v));
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    }, { l: labelText, v: value });
  };

  await setNumber('Width', width);
  await setNumber('Height', height);
  await setNumber('Depth', depth);
  await setNumber('Shelves', shelves);
  await setNumber('Doors', doors);
  await setNumber('Drawer Rows', drawerRows);

  await clickAdd(page);
}

/**
 * Click the n-th piece in the piece list (0-indexed). When `shift` is
 * true, simulates a shift+click to add to the multi-selection.
 */
async function clickPiece(page, index, { shift = false } = {}) {
  await page.evaluate(({ i, s }) => {
    const items = Array.from(document.querySelectorAll('.piece-item'));
    if (!items[i]) throw new Error(`No piece at index ${i} (have ${items.length})`);
    const ev = s
      ? new MouseEvent('click', { bubbles: true, shiftKey: true })
      : new MouseEvent('click', { bubbles: true });
    items[i].dispatchEvent(ev);
  }, { i: index, s: shift });
  await page.waitForTimeout(150);
}

/**
 * Select multiple pieces at once by shift-clicking each. Equivalent
 * to { addPiece, ... clickPiece(0), clickPiece(1, {shift:true}) ... }
 */
async function selectPieces(page, indices) {
  if (indices.length === 0) return;
  await switchToEditTab(page);
  // First one without shift (clears any prior selection)
  await clickPiece(page, indices[0]);
  // Rest with shift
  for (let i = 1; i < indices.length; i++) {
    await clickPiece(page, indices[i], { shift: true });
  }
}

/**
 * Select all pieces via Ctrl+A keyboard shortcut.
 */
async function selectAll(page) {
  await page.keyboard.press('Control+a');
  await page.waitForTimeout(200);
}

/**
 * Click an alignment button. axis is 'X', 'Y', or 'Z' (matching the
 * row labels in the AlignmentPanel). mode is 'min', 'center', or 'max'.
 */
async function clickAlign(page, axis, mode) {
  const ok = await page.evaluate(({ a, m }) => {
    const rows = Array.from(document.querySelectorAll('.align-row'));
    const row = rows.find((r) => r.querySelector('.align-row-label')?.textContent?.trim() === a);
    if (!row) return false;
    const buttons = row.querySelectorAll('.align-btn');
    // Order: min, center, max
    const idx = m === 'min' ? 0 : m === 'center' ? 1 : 2;
    if (!buttons[idx]) return false;
    buttons[idx].click();
    return true;
  }, { a: axis, m: mode });
  if (!ok) throw new Error(`Could not find align button ${axis} / ${mode}`);
  await page.waitForTimeout(300);
}

/**
 * Click a "to wall" button (left, right, back, front, floor, ceiling).
 */
async function clickAlignToWall(page, wall) {
  const labels = {
    left: 'Left', right: 'Right', back: 'Back', front: 'Front',
    floor: 'Floor', ceiling: 'Ceiling',
  };
  const label = labels[wall];
  if (!label) throw new Error(`Unknown wall: ${wall}`);
  const ok = await page.evaluate((l) => {
    const section = Array.from(document.querySelectorAll('.panel-section'))
      .find((s) => s.querySelector('h3')?.textContent?.includes('Align'));
    if (!section) return false;
    const buttons = Array.from(section.querySelectorAll('button'));
    const target = buttons.find((b) => (b.textContent || '').includes(l));
    if (!target) return false;
    target.click();
    return true;
  }, label);
  if (!ok) throw new Error(`Could not find align-to-${wall} button`);
  await page.waitForTimeout(300);
}

/**
 * Click a "distribute" button (x, y, z).
 */
async function clickDistribute(page, axis) {
  const labels = { x: 'X', y: 'Y', z: 'Z' };
  const label = labels[axis];
  if (!label) throw new Error(`Unknown axis: ${axis}`);
  const ok = await page.evaluate((l) => {
    const section = Array.from(document.querySelectorAll('.panel-section'))
      .find((s) => s.querySelector('h3')?.textContent?.includes('Align'));
    if (!section) return false;
    // Distribute buttons contain a single axis letter and are in the
    // .align-distribute-grid.
    const grid = section.querySelector('.align-distribute-grid');
    if (!grid) return false;
    const buttons = Array.from(grid.querySelectorAll('button'));
    // Each button has text like "⇿ X" — match the trailing axis letter
    const target = buttons.find((b) => {
      const t = (b.textContent || '').trim();
      return t.endsWith(' ' + l) || t === l;
    });
    if (!target) return false;
    target.click();
    return true;
  }, label);
  if (!ok) throw new Error(`Could not find distribute-${axis} button`);
  await page.waitForTimeout(300);
}

/**
 * Read the current Zustand state from the page. Returns an object
 * with the fields callers actually need (not the full store, which
 * would be fragile to refactor).
 */
async function readState(page) {
  return await page.evaluate(() => {
    // Walk the React tree to find the store. Zustand stores created
    // with create() expose getState on the hook; we reach it via the
    // documented module export path. Since the project is bundled and
    // there's no global handle, we extract the bits we need from the
    // visible DOM (piece list reflects the store).
    const items = Array.from(document.querySelectorAll('.piece-item'));
    const pieces = items.map((el) => {
      const txt = el.textContent || '';
      return txt;
    });
    return {
      pieceNames: pieces,
      // Whether the alignment panel is rendered (i.e., >= 2 selected)
      alignmentPanelVisible: !!document.querySelector('.align-row'),
    };
  });
}

module.exports = {
  openApp,
  selectTemplate,
  switchToAddTab,
  switchToEditTab,
  clickAdd,
  clickToolbarButton,
  toggleTheme,
  toggleDistances,
  addPiece,
  clickPiece,
  selectPieces,
  selectAll,
  clickAlign,
  clickAlignToWall,
  clickDistribute,
  readState,
  SCENE_SETTLE_MS,
};
