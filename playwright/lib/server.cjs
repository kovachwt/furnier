// Manages a local Vite dev server for the visual regression tests.
//
// If a server is already listening on the port, we reuse it and do NOT
// kill it on stop (so running the tests doesn't nuke the developer's
// dev server). Otherwise we spawn one and terminate it on stop.

const { spawn } = require('child_process');
const http = require('http');
const path = require('path');

const HOST = '127.0.0.1';
// 5179 (not the Vite default 5173) so the test server doesn't collide
// with — or accidentally hit — any other dev server the user has open.
const PORT = Number(process.env.FURNIER_TEST_PORT || 5179);
const BASE_PATH = '/furnier/';
const URL = `http://${HOST}:${PORT}${BASE_PATH}`;

function ping(timeoutMs = 1500) {
  return new Promise((resolve) => {
    const req = http.get(URL, { timeout: timeoutMs }, (res) => {
      // Any HTTP response (even 404) means "something is listening"
      res.resume();
      resolve(res.statusCode);
    });
    req.on('error', () => resolve(null));
    req.on('timeout', () => {
      req.destroy();
      resolve(null);
    });
  });
}

async function waitUntilReady(maxMs = 60000) {
  const start = Date.now();
  while (Date.now() - start < maxMs) {
    const code = await ping();
    if (code && code < 500) return true;
    await new Promise((r) => setTimeout(r, 500));
  }
  return false;
}

async function startServer({ quiet = true } = {}) {
  // Already running? Reuse.
  const existing = await ping();
  if (existing && existing < 500) {
    if (!quiet) console.log(`[server] reusing existing server at ${URL}`);
    return {
      url: URL,
      spawned: false,
      stop: async () => {},
    };
  }

  if (!quiet) console.log(`[server] spawning vite dev server on :${PORT}`);
  const proc = spawn('npx', ['vite', '--host', HOST, '--port', String(PORT), '--strictPort'], {
    cwd: path.resolve(__dirname, '..', '..'),
    env: { ...process.env, CI: '1' },
    stdio: quiet ? 'ignore' : 'inherit',
    detached: false,
  });

  const ready = await waitUntilReady(60000);
  if (!ready) {
    try { proc.kill('SIGTERM'); } catch {}
    throw new Error(`[server] dev server did not become ready at ${URL} within 60s`);
  }

  if (!quiet) console.log(`[server] ready at ${URL}`);

  return {
    url: URL,
    spawned: true,
    stop: async () => {
      if (proc.killed) return;
      proc.kill('SIGTERM');
      await new Promise((r) => setTimeout(r, 250));
      if (!proc.killed) {
        try { proc.kill('SIGKILL'); } catch {}
      }
    },
  };
}

module.exports = { startServer, URL };
