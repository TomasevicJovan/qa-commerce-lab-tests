import { defineConfig, devices } from '@playwright/test';
import { config } from './src/core/config';

export default defineConfig({
  testDir: './tests',
  globalSetup: './src/core/global-setup.ts',
  fullyParallel: true,
  forbidOnly: config.isCI,
  // Intentional lab failures are assertions, not flakiness: keep retries low and visible.
  retries: config.isCI ? 1 : 0,
  workers: config.isCI ? 2 : undefined,
  timeout: 30_000,
  expect: { timeout: 5_000 },
  reporter: config.isCI
    ? [['github'], ['html', { open: 'never' }], ['list']]
    : [['html', { open: 'never' }], ['list']],
  use: {
    baseURL: config.baseUrl,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'api',
      testDir: './tests/api',
    },
    {
      name: 'ui-chromium',
      testDir: './tests/ui',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
