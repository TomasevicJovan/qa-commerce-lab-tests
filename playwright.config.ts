import { defineConfig, devices } from '@playwright/test';
import { config } from './src/core/config';

/**
 * Lab scenario switches (payment failures, paused consumers, stale prices, ...) are global:
 * flipping one affects every test running at the same moment. Those tests live in
 * tests/scenarios and run in the "lab-scenarios" project, which is wired as the teardown of
 * "preflight". Playwright therefore starts it only after api and ui have finished (even when
 * some of them failed) and runs it with a single worker.
 *
 * Teardown projects ignore the CLI --grep, so the same filter is applied to them here.
 * For a focused run of one file, add --no-deps to skip preflight and the scenarios.
 */
function cliRegex(flags: string[]): RegExp | undefined {
  const args = process.argv;
  for (let i = 0; i < args.length; i++) {
    const arg = args[i] ?? '';
    for (const flag of flags) {
      if (arg === flag && args[i + 1]) return new RegExp(args[i + 1] as string);
      if (arg.startsWith(`${flag}=`)) return new RegExp(arg.slice(flag.length + 1));
    }
  }
  return undefined;
}

const grep = cliRegex(['--grep', '-g']);
const grepInvert = cliRegex(['--grep-invert']);

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
      name: 'preflight',
      testDir: './tests/preflight',
      testMatch: /.*\.setup\.ts/,
      teardown: 'lab-scenarios',
    },
    {
      name: 'api',
      testDir: './tests/api',
      dependencies: ['preflight'],
    },
    {
      name: 'ui-chromium',
      testDir: './tests/ui',
      dependencies: ['preflight'],
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'lab-scenarios',
      testDir: './tests/scenarios',
      fullyParallel: false,
      workers: 1,
      use: { ...devices['Desktop Chrome'] },
      ...(grep ? { grep } : {}),
      ...(grepInvert ? { grepInvert } : {}),
    },
  ],
});
