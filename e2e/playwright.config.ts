/**
 * Playwright E2E configuration (mirrors frontend-admin/e2e conventions).
 *
 * == Test conventions ==
 * 1. Selectors: getByRole > getByLabel > getByText > data-testid. No CSS classes.
 * 2. Tiers: tag smoke tests with @smoke (npm run e2e:smoke --grep).
 * 3. External services: mock Core/Payments via e2e mock API; mock Stripe via
 *    page.route (see helpers/stripe-mock.ts). No Stripe secret in CI.
 * 4. Failure: trace on first retry, screenshot on failure.
 */

import { defineConfig, devices } from '@playwright/test';
import path from 'path';

const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:3010';
const mockApiUrl = process.env.E2E_MOCK_API_URL || 'http://127.0.0.1:3099';

// Env for the storefront process started by webServer. NEXT_PUBLIC_* must be
// set at build time (inlined). Do not reuse the GitLab build job artifact --
// that bundle bakes the real API URL.
const storefrontEnv: Record<string, string> = {
  ...process.env,
  NEXT_PUBLIC_CORE_API_URL: mockApiUrl,
  AIMEE_PAYMENTS_API_URL: mockApiUrl,
  AIMEE_API_KEY: 'e2e-test-api-key',
  NEXT_PUBLIC_AIMEE_PUBLISHABLE_KEY: 'pk_test_e2e_publishable',
  NEXT_PUBLIC_STORE_ID: 'store-e2e-1',
  NEXT_PUBLIC_SITE_URL: baseURL,
  // Avoid Cognito env requirements for non-prod in local e2e builds.
  NEXT_PUBLIC_AIMEE_ENV: 'production',
  // Bypass 300s store-config data cache so mock guestCheckout flips apply.
  STORE_CONFIG_REVALIDATE: '0',
};

export default defineConfig({
  testDir: '.',
  testMatch: '**/*.spec.ts',

  globalSetup: './global-setup.ts',
  globalTeardown: './global-teardown.ts',

  timeout: 90_000,
  globalTimeout: 600_000,
  expect: { timeout: 15_000 },

  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,

  reporter: [
    [process.env.CI ? 'github' : 'list'],
    ['json', { outputFile: 'test-results/results.json' }],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
  ],

  outputDir: 'test-results',

  use: {
    baseURL,
    actionTimeout: 30_000,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'off',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: {
    // Single command sequences mock API -> next build -> next start.
    command: 'bash e2e/scripts/run-storefront-e2e.sh',
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 300_000,
    cwd: path.resolve(__dirname, '..'),
    env: storefrontEnv,
  },
});
