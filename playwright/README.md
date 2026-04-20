# Visual Regression Tests

Screenshot-based regression tests for Furnier. Each test drives the app into a specific state via Playwright, screenshots the viewport, and compares the result to a saved `baseline.png` using [pixelmatch](https://github.com/mapbox/pixelmatch).

## Layout

```
playwright/
├── run.cjs              ← CLI entry point
├── lib/
│   ├── server.cjs       ← starts / stops the Vite dev server
│   ├── runner.cjs       ← per-test lifecycle + screenshot diff
│   └── app.cjs          ← UI helpers (openApp, selectTemplate, clickAdd, …)
├── empty-room/
│   ├── test.cjs         ← the test definition
│   └── baseline.png     ← expected output (committed to git)
├── add-cabinet/
├── add-bookshelf/
├── add-desk/
├── add-dresser/
├── add-door-cabinet/
└── exploded-view/
```

Each test lives in its own subfolder. The folder name is the test name.

## Running

```bash
# Run every test (starts + stops the dev server automatically)
node playwright/run.cjs

# Run a single test
node playwright/run.cjs add-cabinet

# Run a handful of tests
node playwright/run.cjs empty-room add-cabinet add-desk

# Regenerate baselines after an intentional visual change
node playwright/run.cjs --update
node playwright/run.cjs add-cabinet --update

# Useful during iteration: keep the dev server running after the suite
node playwright/run.cjs --keep-server

# Stream vite output for debugging
node playwright/run.cjs --verbose
```

Exit code is `0` when every test passes, `1` otherwise.

The runner starts `vite` on `127.0.0.1:5173` if nothing is listening, and reuses an already-running dev server if there is one (so it won't trample a shell you already have open).

## How a test is defined

A test is a CommonJS module at `playwright/<name>/test.cjs`:

```js
module.exports = {
  name: 'add-cabinet',                       // optional, defaults to folder name
  description: 'Add a default open cabinet', // optional, documentation only
  viewport: { width: 1280, height: 900 },    // optional, this is the default
  action: async (page, app) => {
    await app.addPiece(page, { template: 'cabinet' });
  },
};
```

The second argument `app` is [`lib/app.cjs`](./lib/app.cjs) — the shared UI helpers. Prefer them over raw DOM queries so that UI refactors only touch one file.

The runner handles everything around `action`:

1. Launches a fresh Chromium context (`1280×900` by default).
2. Navigates to the dev server, clears `localStorage`, reloads, waits for the canvas and for the R3F scene to settle.
3. Runs your `action` to drive the UI into the target state.
4. Screenshots the viewport and compares to `baseline.png`.

## Baselines

- **First run** of a new test writes `baseline.png` and reports `CREATE`.
- **Subsequent runs** compare against the committed baseline.
- **Intentional visual changes** — run with `--update` to regenerate.

Baselines are committed to git. Review them in PRs like any other screenshot.

> ⚠ **Critical: the first-run baseline is unverified.** If your code has a bug when the test first runs, the baseline captures the bug and the test passes forever. Always:
> 1. Run the test to create the baseline.
> 2. Open `baseline.png` and confirm it shows exactly what you expect.
> 3. Only then commit it.

### Adding negative tests

When adding a feature that produces visual overlays (clash boxes, guides, labels), also write a test for the **absence** case. For example, after writing `clash-detection/test.cjs` (two overlapping cabinets), add a `no-clash` test with two separated cabinets that asserts no red boxes appear. A phantom overlay at `[0,0,0]` will show up immediately as a diff against the clean baseline.

## Failure artifacts

When a test fails the runner writes two files into the test folder:

- `actual.png` — what the app actually rendered this run
- `diff.png` — highlighted pixel differences from pixelmatch

Both files are ignored by git (see `.gitignore`). On the next pass they are deleted automatically.

## Thresholds

`playwright/lib/runner.cjs` controls tolerance:

- **`PIXEL_THRESHOLD = 0.15`** — per-pixel color tolerance passed to pixelmatch.
- **`MAX_DIFF_RATIO = 0.005`** — up to 0.5% of pixels may differ before the test fails.

WebGL output on headless Chromium is not bit-exact across machines/GPU drivers. If you see flaky failures of ≤0.5% on CI that are unreproducible locally, bump `MAX_DIFF_RATIO` rather than chase ghost pixels.

## Adding a new test

1. `mkdir playwright/my-new-test`
2. Create `playwright/my-new-test/test.cjs` following the template above.
3. `node playwright/run.cjs my-new-test` — first run writes the baseline.
4. **Open and inspect `baseline.png`** — confirm it shows exactly what you expect. If it looks wrong, fix your code *before* committing the baseline.
5. Commit the folder, `baseline.png` included.

### Adding programmatic assertions

The `action` runs inside the Playwright page context. Use `page.evaluate()` to verify store state or DOM content *before* the screenshot is taken. A `throw` in the action fails the test immediately, which is faster and more informative than a visual diff:

```js
action: async (page, app) => {
  await app.addPiece(page, { template: 'cabinet' });
  // Verify the piece was actually added
  const count = await page.evaluate(() => useStore.getState().project.pieces.length);
  if (count !== 1) throw new Error(`Expected 1 piece, got ${count}`);
  // Now take the screenshot (done automatically by the runner)
},
```

If your test needs a UI interaction that isn't already in `lib/app.cjs`, add a helper there first.
