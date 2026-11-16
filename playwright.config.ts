import { defineConfig } from '@playwright/test';

const baseURL = (process.env.QA_LOCAL_URL || 'http://127.0.0.1:4173').replace(/\/?$/, '/');

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 35_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  workers: 3,
  reporter: [['list'], ['json', { outputFile: 'visual-qa/reports/playwright.json' }]],
  use: {
    baseURL,
    channel: process.env.QA_BROWSER_CHANNEL || undefined,
    deviceScaleFactor: 1,
    locale: 'en-US',
    timezoneId: 'America/New_York',
    colorScheme: 'light',
    reducedMotion: 'reduce',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: process.env.QA_LOCAL_URL ? undefined : {
    command: 'npm run dev',
    url: baseURL,
    reuseExistingServer: true,
    timeout: 30_000,
  },
});
