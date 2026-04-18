// Baseline sanity invariants.
//
// Visual regression passes when `actual.png ≈ baseline.png`. That is
// completely silent if the baseline was recorded while the app was
// broken — "broken from birth" regressions go undetected because every
// run matches the (equally broken) baseline.
//
// These invariants run against the committed baseline image itself and
// assert that the 3D viewport region looks like "something was rendered"
// — non-trivial color diversity, not dominated by near-black pixels.
// If a baseline fails the invariants, any test using it is flagged
// regardless of whether the fresh screenshot matches it.
//
// The checks are intentionally loose so they don't fire on legitimate
// minimalist scenes (empty room, dark theme). They only catch the
// "viewport is effectively blank" failure mode.

const fs = require('fs');
const { PNG } = require('pngjs');

// The app layout is fixed: 280px sidebar on the left + a toolbar on top.
// We sample a central slice of the 3D viewport so sidebar/toolbar
// content (which is always non-trivial) can't mask a broken viewport.
const VIEWPORT_CROP = {
  x0: 400,   // right of sidebar + padding
  y0: 120,   // below toolbar + padding
  x1: 1200,  // inside right edge
  y1: 800,   // above bottom edge
};

// Thresholds. Tuned so the darkest legitimate scene we ship (empty room
// on the dark theme, ~32 mean luminance, ~1200 unique color buckets)
// passes comfortably while a fully-black viewport fails.
const MIN_UNIQUE_COLORS = 30;       // empty-room on dark theme: ~66; broken viewport: 1
const MAX_NEAR_BLACK_PCT = 85;      // viewport can be dark, but not this dark
const MIN_MEAN_LUMINANCE = 4;       // below this it's functionally black

function analyzeViewport(pngPath, crop = VIEWPORT_CROP) {
  const buf = fs.readFileSync(pngPath);
  const png = PNG.sync.read(buf);
  const { width, height, data } = png;

  const x0 = Math.max(0, Math.min(crop.x0, width));
  const y0 = Math.max(0, Math.min(crop.y0, height));
  const x1 = Math.max(x0, Math.min(crop.x1, width));
  const y1 = Math.max(y0, Math.min(crop.y1, height));

  const colors = new Set();
  let sumL = 0;
  let nearBlack = 0;
  let n = 0;

  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const i = (y * width + x) * 4;
      const r = data[i], g = data[i + 1], b = data[i + 2];
      // Quantize into 5-bit-per-channel buckets — noise-tolerant but
      // still distinguishes a gradient from a flat fill.
      const key = ((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3);
      colors.add(key);
      const L = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      sumL += L;
      if (L < 16) nearBlack++;
      n++;
    }
  }

  return {
    pixelsSampled: n,
    uniqueColors: colors.size,
    meanLuminance: n > 0 ? sumL / n : 0,
    nearBlackPct: n > 0 ? (100 * nearBlack) / n : 0,
    width,
    height,
  };
}

/**
 * Validate a baseline's viewport region against the invariants.
 * Returns { ok: true } on pass, { ok: false, reason } on fail.
 */
function validateBaseline(pngPath) {
  let stats;
  try {
    stats = analyzeViewport(pngPath);
  } catch (e) {
    return { ok: false, reason: `invariant probe failed: ${e.message}` };
  }

  const fails = [];
  if (stats.uniqueColors < MIN_UNIQUE_COLORS) {
    fails.push(
      `viewport has only ${stats.uniqueColors} distinct colors (min ${MIN_UNIQUE_COLORS}) — scene looks unrendered`
    );
  }
  if (stats.meanLuminance < MIN_MEAN_LUMINANCE) {
    fails.push(
      `viewport mean luminance ${stats.meanLuminance.toFixed(1)} < ${MIN_MEAN_LUMINANCE} — viewport is effectively black`
    );
  }
  if (stats.nearBlackPct > MAX_NEAR_BLACK_PCT) {
    fails.push(
      `viewport is ${stats.nearBlackPct.toFixed(1)}% near-black (max ${MAX_NEAR_BLACK_PCT}%) — scene likely didn't render`
    );
  }

  if (fails.length) {
    return { ok: false, reason: `baseline invariants: ${fails.join('; ')}`, stats };
  }
  return { ok: true, stats };
}

module.exports = {
  analyzeViewport,
  validateBaseline,
  VIEWPORT_CROP,
  MIN_UNIQUE_COLORS,
  MAX_NEAR_BLACK_PCT,
  MIN_MEAN_LUMINANCE,
};
