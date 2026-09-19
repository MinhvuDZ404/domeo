import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  workers: 1,
  timeout: 25000,
  expect: { timeout: 6000 },
  // On CI the github reporter turns failures into annotations on the pull request,
  // which stay readable even when the raw job log is not downloadable.
  reporter: process.env.CI ? [['list'], ['github']] : 'list',
  outputDir: '.cache/test-results',
  use: {
    baseURL: 'http://127.0.0.1:5173',
    viewport: { width: 1280, height: 800 },
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE
      ? {
          executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE,
          args: ['--no-sandbox', '--disable-dev-shm-usage'],
        }
      : {},
  },
  webServer: {
    command: 'npm run dev',
    url: 'http://127.0.0.1:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 15000,
  },
});
