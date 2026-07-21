import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:9001';
const isCI = !!process.env.CI;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  workers: isCI ? 1 : undefined,
  timeout: 60_000,
  expect: { timeout: 15_000 },
  reporter: isCI
    ? [['github'], ['html', { open: 'never' }], ['list']]
    : [['list'], ['html', { open: 'on-failure' }]],
  outputDir: 'test-results',
  globalSetup: './e2e/global-setup.ts',
  use: {
    baseURL,
    trace: isCI ? 'retain-on-failure' : 'on-first-retry',
    video: isCI ? 'retain-on-failure' : 'off',
    screenshot: 'only-on-failure',
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },
  projects: [
    {
      name: 'setup',
      testMatch: /auth\.setup\.ts/,
    },
    {
      name: 'chromium-shell',
      testMatch: '**/smoke.spec.ts',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'chromium-live',
      testMatch: ['**/*.smoke.spec.ts', '**/project-creation.spec.ts'],
      testIgnore: ['**/smoke.spec.ts', '**/golden-path-*.spec.ts'],
      dependencies: ['setup'],
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'chromium-golden-path',
      testMatch: '**/golden-path-*.spec.ts',
      dependencies: ['setup'],
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: process.env.PLAYWRIGHT_SKIP_WEBSERVER
    ? undefined
    : {
        command: 'pnpm exec vite --host 127.0.0.1 --port 9001',
        url: baseURL,
        reuseExistingServer: !isCI,
        timeout: 120_000,
        env: {
          ...process.env,
          VITE_PROXY_TARGET:
            process.env.VITE_PROXY_TARGET ?? 'http://127.0.0.1:9000',
        },
      },
});
