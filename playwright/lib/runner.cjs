// Runs a single visual-regression test.
//
// A test is a CommonJS module at playwright/<name>/test.cjs that
// exports:
//   {
//     name?:        string,            // defaults to folder name
//     description?: string,
//     viewport?:    { width, height }, // default 1280×900
//     action:       async (page, app) => void,
//   }
//
// The runner:
//   1. Opens the app in a fresh browser context
//   2. Runs `action` to drive the UI into the target state
//   3. Screenshots the page
//   4. Compares to baseline.png in the test folder using pixelmatch
//
// First run (or `--update`) writes the baseline. Subsequent runs
// compare and emit actual.png + diff.png on mismatch.

const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const { PNG } = require('pngjs');
const pixelmatch = require('pixelmatch');
const appHelpers = require('./app.cjs');
const { validateBaseline } = require('./invariants.cjs');

// Pixelmatch threshold: 0 = exact, 1 = all colors match.
// 0.15 tolerates minor anti-aliasing / subpixel rendering drift.
const PIXEL_THRESHOLD = 0.15;
// Maximum proportion of pixels allowed to differ before we fail.
// WebGL HDR environment maps load asynchronously and produce
// non-deterministic rendering differences between runs (typically
// 1-2% of pixels differ in shading). 2% is still tight enough to
// catch real regressions (a missing room or furniture piece differs
// by 30%+ pixels).
const MAX_DIFF_RATIO = 0.02;

function readPng(file) {
  return PNG.sync.read(fs.readFileSync(file));
}

function writePng(file, png) {
  fs.writeFileSync(file, PNG.sync.write(png));
}

function comparePngs(baselineFile, actualFile, diffFile) {
  const a = readPng(baselineFile);
  const b = readPng(actualFile);
  if (a.width !== b.width || a.height !== b.height) {
    return {
      mismatch: a.width * a.height,
      ratio: 1,
      width: a.width,
      height: a.height,
      reason: `size mismatch: baseline=${a.width}x${a.height} actual=${b.width}x${b.height}`,
    };
  }
  const { width, height } = a;
  const diff = new PNG({ width, height });
  const mismatch = pixelmatch(a.data, b.data, diff.data, width, height, {
    threshold: PIXEL_THRESHOLD,
  });
  writePng(diffFile, diff);
  return {
    mismatch,
    ratio: mismatch / (width * height),
    width,
    height,
  };
}

async function loadTest(folder) {
  const testFile = path.join(folder, 'test.cjs');
  if (!fs.existsSync(testFile)) {
    throw new Error(`No test.cjs found in ${folder}`);
  }
  const mod = require(testFile);
  return {
    name: mod.name || path.basename(folder),
    description: mod.description || '',
    viewport: mod.viewport || { width: 1280, height: 900 },
    action: mod.action,
    folder,
  };
}

async function runTest(folder, { url, browser, update = false, verbose = false } = {}) {
  const test = await loadTest(folder);
  const baselineFile = path.join(folder, 'baseline.png');
  const actualFile = path.join(folder, 'actual.png');
  const diffFile = path.join(folder, 'diff.png');

  // Clean leftover artifacts from previous runs.
  for (const f of [actualFile, diffFile]) {
    if (fs.existsSync(f)) fs.unlinkSync(f);
  }

  const context = await browser.newContext({ viewport: test.viewport });
  const page = await context.newPage();

  const consoleErrors = [];
  page.on('pageerror', (err) => consoleErrors.push(`[pageerror] ${err.message}`));
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(`[console.error] ${msg.text()}`);
  });

  try {
    await appHelpers.openApp(page, url);
    if (typeof test.action === 'function') {
      await test.action(page, appHelpers);
    }
    // One last settle to let any pending frames paint.
    await page.waitForTimeout(400);
    await page.screenshot({ path: actualFile, fullPage: false });
  } finally {
    await context.close();
  }

  const baselineExists = fs.existsSync(baselineFile);

  if (update || !baselineExists) {
    // Before accepting the new baseline, run the "does this look
    // rendered?" invariants. If the viewport is effectively blank we
    // refuse to write the baseline — that's exactly the failure mode
    // (broken-from-birth) silent pixelmatch can't detect later.
    const invariants = validateBaseline(actualFile);
    if (!invariants.ok) {
      // Preserve the rejected screenshot so the dev can inspect it.
      return {
        name: test.name,
        status: 'failed',
        reason: `refused to ${baselineExists ? 'update' : 'create'} baseline — ${invariants.reason}`,
        errors: consoleErrors,
        artifacts: { actual: actualFile },
      };
    }
    fs.copyFileSync(actualFile, baselineFile);
    // Drop actual.png on success/create so the folder stays clean.
    if (fs.existsSync(actualFile)) fs.unlinkSync(actualFile);
    return {
      name: test.name,
      status: baselineExists ? 'updated' : 'created',
      errors: consoleErrors,
    };
  }

  // Pixelmatch against the baseline catches regressions from the
  // baseline's state. Invariants catch the orthogonal case: the
  // baseline itself was recorded while the app was broken. Run both.
  const baselineInvariants = validateBaseline(baselineFile);
  const result = comparePngs(baselineFile, actualFile, diffFile);
  const pixelPassed = !result.reason && result.ratio <= MAX_DIFF_RATIO;
  const passed = pixelPassed && baselineInvariants.ok;

  if (passed) {
    // On pass, keep artifacts tidy: drop actual/diff so git stays clean.
    if (fs.existsSync(actualFile)) fs.unlinkSync(actualFile);
    if (fs.existsSync(diffFile)) fs.unlinkSync(diffFile);
  }

  const failureReason = result.reason
    || (!baselineInvariants.ok ? baselineInvariants.reason : undefined);

  return {
    name: test.name,
    status: passed ? 'passed' : 'failed',
    mismatch: result.mismatch,
    ratio: result.ratio,
    reason: failureReason,
    errors: consoleErrors,
    artifacts: passed ? null : { actual: actualFile, diff: diffFile },
  };
}

module.exports = { runTest, loadTest, MAX_DIFF_RATIO, PIXEL_THRESHOLD };
