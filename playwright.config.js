// @ts-check
const { defineConfig, devices } = require('@playwright/test');

const useLocalFiles = process.env.HM_LOCAL_FILE === '1';
const workersOverride = process.env.HM_WORKERS ? Number(process.env.HM_WORKERS) : null;

module.exports = defineConfig({
  testDir: './tests',
  // Tests share a single-threaded http-server (see "Test webServer" below).
  // Running workers in parallel multiplies simultaneous GLB/scene.bin fetches
  // and starves the server, so the default is serial. Override with:
  //   HM_WORKERS=4 npm test   (or  npm run test:parallel)
  fullyParallel: workersOverride ? workersOverride > 1 : false,
  workers: workersOverride ?? 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: 'list',
  timeout: 60_000,
  expect: { timeout: 5_000 },
  use: {
    headless: true,
    launchOptions: {
      args: ['--allow-file-access-from-files']
    },
    baseURL: useLocalFiles ? `file://${process.cwd()}` : 'http://localhost:8080',
    viewport: { width: 1280, height: 800 },
    actionTimeout: 10_000,
    navigationTimeout: 30_000,
  },
  // Test webServer.
  //
  // Why `npm run test:server` instead of `npm run start`:
  //   - `npm run start` runs `http-server -p 8080 -o`. The `-o` flag opens a
  //     REAL browser (Safari/Chrome) the moment the server starts. That
  //     browser hits the same single-threaded server with its own asset
  //     requests, stealing bandwidth and CPU from Playwright workers.
  //     It can also leave a hung browser process if the run is aborted.
  //   - `http-server -p 8080 -s -c-1` is silent, doesn't open a browser,
  //     and disables HTTP caching so source/model changes are picked up
  //     between runs without a server restart.
  //   - `reuseExistingServer: true` lets a developer keep a server running
  //     across multiple `npm test` invocations.
  webServer: useLocalFiles ? undefined : {
    command: 'npm run test:server',
    port: 8080,
    reuseExistingServer: true,
    timeout: 120_000,
    stdout: 'ignore',
    stderr: 'pipe',
  },
  // Per-project overrides (file:// fallback runs without a server).
  projects: useLocalFiles ? [
    { name: 'local-file', use: { baseURL: `file://${process.cwd()}` } }
  ] : undefined,
});
