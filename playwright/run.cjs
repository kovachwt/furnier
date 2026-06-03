#!/usr/bin/env node
// Visual regression test runner for Furnier.
//
// Usage:
//   node playwright/run.cjs                    # run all tests
//   node playwright/run.cjs add-cabinet        # run a single test by folder name
//   node playwright/run.cjs --tier=core        # run only the core tier
//   node playwright/run.cjs --tier=extended    # run only the extended tier
//   node playwright/run.cjs --update           # regenerate all baselines
//   node playwright/run.cjs add-cabinet --update
//   node playwright/run.cjs --keep-server      # don't stop the dev server afterward
//   node playwright/run.cjs --verbose          # show vite server output
//
// Exit code 0 on all pass, 1 on any failure.

const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const { startServer } = require('./lib/server.cjs');
const { runTest } = require('./lib/runner.cjs');

const ROOT = __dirname;
const VALID_TIERS = new Set(['core', 'extended', 'all']);

function parseArgs(argv) {
  const out = { update: false, verbose: false, keepServer: false, filters: [], tier: 'all' };
  for (const arg of argv) {
    if (arg === '--update' || arg === '-u') out.update = true;
    else if (arg === '--verbose' || arg === '-v') out.verbose = true;
    else if (arg === '--keep-server') out.keepServer = true;
    else if (arg === '--help' || arg === '-h') out.help = true;
    else if (arg.startsWith('--tier=')) out.tier = arg.slice('--tier='.length);
    else out.filters.push(arg);
  }
  return out;
}

function discoverTests() {
  // Require the test module up front so we can read its `tier` field
  // for filtering. `require` caches modules, so this is free for the
  // later `runTest` call.
  return fs
    .readdirSync(ROOT, { withFileTypes: true })
    .filter((e) => e.isDirectory() && e.name !== 'lib' && e.name !== 'node_modules')
    .map((e) => path.join(ROOT, e.name))
    .filter((p) => fs.existsSync(path.join(p, 'test.cjs')))
    .sort()
    .map((folder) => {
      const mod = require(path.join(folder, 'test.cjs'));
      return {
        folder,
        name: mod.name || path.basename(folder),
        tier: mod.tier || 'core',
      };
    });
}

function printHelp() {
  console.log(`
Visual regression test runner for Furnier

Usage:
  node playwright/run.cjs                       run every test
  node playwright/run.cjs <name> [<name>...]    run only named tests (folder names)
  node playwright/run.cjs --tier=core           run only tests tagged tier: "core"
  node playwright/run.cjs --tier=extended       run only tests tagged tier: "extended"
  node playwright/run.cjs --update              regenerate baselines
  node playwright/run.cjs --keep-server         leave dev server running on exit
  node playwright/run.cjs --verbose             stream dev-server output

Tiers:
  core      \u2014 the fast subset; covers the critical user paths and the
              features most likely to regress. ~2-3 min on a warm machine.
  extended  \u2014 slower tests that exercise multi-piece flows
              (align, distribute, undo/redo, search, multi-select).
  all       \u2014 every test (default).

A test file opts into a tier with \`tier: 'core'\` or \`tier: 'extended'\`.
The default is 'core' so a newly added test is fast to iterate on;
mark \`tier: 'extended'\` for tests that do many addPiece() calls.
`);
}

const COLORS = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  dim: '\x1b[2m',
};
const color = (c, s) => `${COLORS[c]}${s}${COLORS.reset}`;

const NAME_COL = 30; // Longest test name is "camera-orientation-preset" (25) + slack.
const TIME_COL = 6;  // "  9.9s" with leading space.

function pad(s, w) {
  s = String(s);
  return s.length >= w ? s : s + ' '.repeat(w - s.length);
}

function padLeft(s, w) {
  s = String(s);
  return s.length >= w ? s : ' '.repeat(w - s.length) + s;
}

function formatResult(r) {
  const pct = r.ratio != null ? ` (${(r.ratio * 100).toFixed(3)}% diff, ${r.mismatch} px)` : '';
  const time = r.ms != null ? `  ${(r.ms / 1000).toFixed(1)}s` : '';
  const name = pad(r.name, NAME_COL);
  const timeStr = r.ms != null ? color('dim', padLeft((r.ms / 1000).toFixed(1) + 's', TIME_COL)) : '';
  switch (r.status) {
    case 'passed':  return `${color('green',  '  PASS  ')} ${name}  ${color('dim', pct)}${timeStr}`;
    case 'failed':  return `${color('red',    '  FAIL  ')} ${name}  ${color('dim', pct)}${timeStr}${r.reason ? color('red', ' \u2014 ' + r.reason) : ''}`;
    case 'created': return `${color('cyan',   ' CREATE ')} ${name} (baseline saved)${timeStr}`;
    case 'updated': return `${color('yellow', ' UPDATE ')} ${name} (baseline regenerated)${timeStr}`;
    case 'error':   return `${color('red',    ' ERROR  ')} ${name}${timeStr}${r.reason ? color('red', ' \u2014 ' + r.reason) : ''}`;
    default:        return `  ?     ${name} (${r.status})${timeStr}`;
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) { printHelp(); process.exit(0); }

  if (!VALID_TIERS.has(args.tier)) {
    console.error(`Unknown --tier value: ${args.tier}`);
    console.error(`Valid: ${[...VALID_TIERS].join(', ')}`);
    process.exit(1);
  }

  const all = discoverTests();
  let selected = all;
  if (args.tier !== 'all') {
    selected = selected.filter((t) => t.tier === args.tier);
  }
  if (args.filters.length) {
    const wanted = new Set(args.filters);
    selected = selected.filter((t) => wanted.has(t.name));
  }

  if (selected.length === 0) {
    if (args.filters.length || args.tier !== 'all') {
      console.error(`No test folders match: filters=[${args.filters.join(', ') || ''}] tier=${args.tier}`);
      console.error(`Available: ${all.map((t) => t.name + (t.tier === 'core' ? '' : ' [' + t.tier + ']')).join(', ') || '(none)'}`);
    } else {
      console.error('No tests found in playwright/');
    }
    process.exit(1);
  }

  console.log(color('dim', `Starting dev server\u2026`));
  const server = await startServer({ quiet: !args.verbose });
  console.log(color('dim', `  ${server.url}${server.spawned ? '' : ' (already running \u2014 reusing)'}`));

  const browser = await chromium.launch({ headless: true });
  const results = [];

  try {
    const tierLabel = args.tier === 'all' ? '' : ` (tier: ${args.tier})`;
    console.log(color('dim', `Running ${selected.length} test${selected.length === 1 ? '' : 's'}${tierLabel}\u2026\n`));
    for (const t of selected) {
      const { name, folder } = t;
      process.stdout.write(color('dim', `  \u2026 ${name}\r`));
      const t0 = Date.now();
      let r;
      try {
        r = await runTest(folder, { url: server.url, browser, update: args.update });
      } catch (err) {
        r = { name, status: 'error', reason: err.message };
      }
      r.ms = Date.now() - t0;
      results.push(r);
      process.stdout.write(' '.repeat(40) + '\r');
      console.log(formatResult(results[results.length - 1]));
      const errs = results[results.length - 1].errors;
      if (errs && errs.length) {
        for (const e of errs) console.log(color('dim', `         ${e}`));
      }
    }
  } finally {
    await browser.close();
    if (!args.keepServer) {
      await server.stop();
    }
  }

  const failed = results.filter((r) => r.status === 'failed' || r.status === 'error');
  const passed = results.filter((r) => r.status === 'passed').length;
  const created = results.filter((r) => r.status === 'created').length;
  const updated = results.filter((r) => r.status === 'updated').length;

  console.log('');
  console.log(`  ${color('green', passed + ' passed')}` +
              (created ? `, ${color('cyan',   created + ' created')}`   : '') +
              (updated ? `, ${color('yellow', updated + ' updated')}`   : '') +
              (failed.length ? `, ${color('red', failed.length + ' failed')}` : ''));

  // Time summary
  const timed = results.filter((r) => r.ms != null);
  if (timed.length > 0) {
    const total = timed.reduce((s, r) => s + r.ms, 0);
    const mean = total / timed.length;
    const slowest = timed.reduce((m, r) => (r.ms > m.ms ? r : m), { ms: 0, name: '' });
    console.log(color('dim',
      `\n  Total: ${(total / 1000).toFixed(1)}s   Mean: ${(mean / 1000).toFixed(1)}s   Slowest: ${slowest.name} (${(slowest.ms / 1000).toFixed(1)}s)`
    ));
  }

  if (failed.length) {
    console.log('\nFailed tests have actual.png + diff.png in their folder for inspection.');
    process.exit(1);
  }
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
