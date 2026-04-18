// App-specific Playwright helpers for Furnier.
//
// Each helper takes the Page object and performs a semantic action
// (open the app, add a piece, toggle a tool). Keeping UI selectors
// centralized here means if the UI changes we update one file
// instead of N tests.

const SCENE_SETTLE_MS = 2500;

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

async function selectTemplate(page, value) {
  // The template <select> is the first select on the Add panel.
  // We locate by its <option> value for robustness.
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

module.exports = {
  openApp,
  selectTemplate,
  clickAdd,
  clickToolbarButton,
  addPiece,
  SCENE_SETTLE_MS,
};
