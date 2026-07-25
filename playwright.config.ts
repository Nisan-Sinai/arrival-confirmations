import { defineConfig, devices } from '@playwright/test';
import { config as loadDotenv } from 'dotenv';

loadDotenv({ path: '.env.local', quiet: true });

const baseURL = process.env.TEST_BASE_URL ?? 'http://localhost:3000';
const isCI = Boolean(process.env.CI);

/**
 * E2E and accessibility suites (§10.5, §9).
 *
 * Chromium only — the specification does not require cross-browser coverage, and a
 * single engine keeps the browser download inside the available disk budget.
 *
 * `fullyParallel` is off: every spec talks to the same Supabase project, so parallel
 * workers would race on shared rows. Auto-waiting only; no hard-coded sleeps.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: isCI
    ? [['html', { open: 'never' }], ['github'], ['list']]
    : [['html', { open: 'never' }], ['list']],
  use: {
    baseURL,
    locale: 'he-IL',
    timezoneId: 'Asia/Jerusalem',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'mobile',
      use: { ...devices['Pixel 7'] },
      testMatch: /.*\.mobile\.spec\.ts/,
    },
  ],
  webServer: {
    command: isCI ? 'pnpm start' : 'pnpm dev',
    url: baseURL,
    reuseExistingServer: !isCI,
    timeout: 180_000,
  },
});
