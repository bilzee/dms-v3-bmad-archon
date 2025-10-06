import { defineConfig, devices } from '@playwright/test';

// PWA Testing configuration
const isPWATesting = process.env.PWA_TESTING === 'true';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://127.0.0.1:3000',
    trace: 'on-first-retry',
    // Additional context for PWA testing
    contextOptions: {
      permissions: ['notifications'],
      ...(isPWATesting && {
        serviceWorkers: 'allow',
        permissions: ['notifications', 'background-sync'],
      }),
    },
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },
  ],

  webServer: {
    command: isPWATesting ? 'npm run dev:pwa' : 'npm run dev',
    url: 'http://127.0.0.1:3000',
    reuseExistingServer: !process.env.CI,
    env: {
      ...(isPWATesting && { PWA_TESTING: 'true' }),
    },
  },
});