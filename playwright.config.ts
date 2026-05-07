import { defineConfig, devices } from '@playwright/test';
import { config } from 'dotenv';

// Load .env.test for local test runs (ignored in CI where env vars are injected directly)
config({ path: '.env.test', override: false });

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['html', { outputFolder: 'tests/playwright-report' }], ['list']],

  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    // Auth setup — runs once before all tests, saves session to disk
    {
      name: 'setup',
      testMatch: '**/auth.setup.ts',
    },
    {
      name: 'admin-setup',
      testMatch: '**/auth.admin.setup.ts',
    },
    {
      name: 'chromium',
      // Admin specs (j5-j10) are excluded — they require admin auth and run under the [admin] project.
      // ui-review.spec.ts is also excluded from regular test runs (it's a separate screenshot audit).
      testIgnore: [
        '**/j5-*.spec.ts',
        '**/j6-*.spec.ts',
        '**/j7-*.spec.ts',
        '**/j9-*.spec.ts',
        '**/j10-*.spec.ts',
        '**/ui-review.spec.ts',
      ],
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'tests/fixtures/.auth/user.json',
      },
      dependencies: ['setup'],
    },
    {
      name: 'admin',
      testMatch: [
        '**/j5-*.spec.ts',
        '**/j6-*.spec.ts',
        '**/j7-*.spec.ts',
        '**/j9-*.spec.ts',
        '**/j10-*.spec.ts',
      ],
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'tests/fixtures/.auth/admin.json',
      },
      dependencies: ['admin-setup'],
    },
    // Mobile tests are intentionally excluded from the default run.
    // The current test suite is written for desktop layout (sm: breakpoints).
    // Run mobile explicitly: npm run test:e2e:mobile
    // {
    //   name: 'mobile-chrome',
    //   use: { ...devices['Pixel 5'], storageState: 'tests/fixtures/.auth/user.json' },
    //   dependencies: ['setup'],
    // },
  ],

  // Start the dev server before running tests in non-CI environments
  webServer: process.env.CI
    ? undefined
    : {
        command: 'npm run dev',
        url: 'http://localhost:5173',
        reuseExistingServer: true,
        timeout: 30_000,
      },
});
