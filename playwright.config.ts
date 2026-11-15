import { defineConfig, devices } from '@playwright/test';
import { config as loadDotenv } from 'dotenv';

import { FIXTURE_ORIGIN } from './e2e/fixtures/scroll-data.mjs';

loadDotenv({ path: '.env.local', quiet: true });

const baseURL = process.env.TEST_BASE_URL ?? 'http://localhost:3000';
const isCI = Boolean(process.env.CI);
const isLocal = ['localhost', '127.0.0.1'].includes(new URL(baseURL).hostname);
const mobileSpecs = /.*\.mobile\.spec\.ts/;

/**
 * E2E and accessibility suites (§10.5, §9).
 *
 * Desktop coverage uses Chromium. Touch and scroll regressions also run in WebKit.
 * A single worker keeps the suites that share database fixtures from racing.
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
    // Product journeys explicitly decline optional analytics; consent has a separate suite.
    storageState: {
      cookies: [],
      origins: [
        {
          origin: new URL(baseURL).origin,
          localStorage: [{ name: 'public-analytics-consent-v1', value: 'denied' }],
        },
      ],
    },
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
      testIgnore: mobileSpecs,
    },
    {
      name: 'mobile',
      use: { ...devices['Pixel 5'] },
      testMatch: mobileSpecs,
    },
    {
      name: 'iphone',
      use: { ...devices['iPhone 13'] },
      testMatch: mobileSpecs,
    },
  ],
  webServer: isLocal
    ? [
        ...(process.env.NEXT_PUBLIC_SUPABASE_URL === FIXTURE_ORIGIN
          ? [
              {
                command:
                  'node --input-type=module -e "import { startScrollFixture } from \'./e2e/fixtures/scroll-data.mjs\'; startScrollFixture()"',
                url: `${FIXTURE_ORIGIN}/health`,
                reuseExistingServer: !isCI,
              },
            ]
          : []),
        {
          command: isCI ? 'pnpm start' : 'pnpm dev',
          url: baseURL,
          reuseExistingServer: !isCI,
          timeout: 180_000,
        },
      ]
    : undefined,
});
