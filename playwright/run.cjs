#!/usr/bin/env node
// Visual regression test runner for Furnier.
//
// Usage:
//   node playwright/run.cjs                    # run all tests
//   node playwright/run.cjs add-cabinet        # run a single test by folder name
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

function parseArgs(argv) {
  const out = { update: false, verbose: false, keepServer: false, filters: [] };
  for (const arg of argv) {
    if (arg === '--update' || arg === '-u') out.update = true;
    else if (arg === '--verbose' || arg === '-v') out.verbose = true;
    else if (arg === '--keep-server') out.keepServer = true;
    else if (arg === '--help' || arg === '-h') out.help = true;
    else out.filters.push(arg);
  }
  return out;
}

function discoverTests() {
  return fs
    .readdirSync(ROOT, { withFileTypes: true })
    .filter((e) => e.isDirectory() && e.name !== 'lib' && e.name !== 'node_modules')
    .map((e) => path.join(ROOT, e.name))
    .filter((p) => fs.existsSync(path.join(p, 'test.cjs')))
    .sort();
}

function printHelp() {
  console.log(`
Visual regression test runner for Furnier

Usage:
  node playwright/run.cjs                       run every test
  node playwright/run.cjs <name> [<name>...]    run only named tests (folder names)
  node playwright/run.cjs --update              regenerate baselines
  node playwright/run.cjs --keep-server         leave dev server running on exit
  node playwright/run.cjs --verbose             stream dev-server output
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

function formatResult(r) {
  const pct = r.ratio != null ? ` (${(r.ratio * 100).toFixed(3)}% diff, ${r.mismatch} px)` : '';
  switch (r.status) {
    case 'passed':  return `${color('green',  '  PASS  ')} ${r.name}${color('dim', pct)}`;
    case 'failed':  return `${color('red',    '  FAIL  ')} ${r.name}${pct}${r.reason ? ' — ' + r.reason : ''}`;
    case 'created': return `${color('cyan',   ' CREATE ')} ${r.name} (baseline saved)`;
    case 'updated': return `${color('yellow', ' UPDATE ')} ${r.name} (baseline regenerated)`;
    case 'error':   return `${color('red',    ' ERROR  ')} ${r.name} — ${r.reason}`;
    default:        return `  ?     ${r.name} (${r.status})`;
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) { printHelp(); process.exit(0); }

  const all = discoverTests();
  const selected = args.filters.length
    ? all.filter((p) => args.filters.includes(path.basename(p)))
    : all;

  if (selected.length === 0) {
    if (args.filters.length) {
      console.error(`No test folders match: ${args.filters.join(', ')}`);
      console.error(`Available: ${all.map((p) => path.basename(p)).join(', ') || '(none)'}`);
    } else {
      console.error('No tests found in playwright/');
    }
    process.exit(1);
  }

  console.log(color('dim', `Starting dev server…`));
  const server = await startServer({ quiet: !args.verbose });
  console.log(color('dim', `  ${server.url}${server.spawned ? '' : ' (already running — reusing)'}`));

  const browser = await chromium.launch({ headless: true });
  const results = [];

  try {
    console.log(color('dim', `Running ${selected.length} test${selected.length === 1 ? '' : 's'}…\n`));
    for (const folder of selected) {
      const name = path.basename(folder);
      process.stdout.write(color('dim', `  … ${name}\r`));
      try {
        const r = await runTest(folder, { url: server.url, browser, update: args.update });
        results.push(r);
      } catch (err) {
        results.push({ name, status: 'error', reason: err.message });
      }
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
