// @ts-check
const { defineConfig, devices } = require('@playwright/test');

const useLocalFiles = process.env.HM_LOCAL_FILE === '1';

module.exports = defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: 'list',
  timeout: 60_000,
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
  webServer: useLocalFiles ? undefined : {
    command: 'npm run start',
    port: 8080,
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
