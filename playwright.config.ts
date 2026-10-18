import { defineConfig, devices } from '@playwright/test'
import { E2E_BASE_URL } from './e2e/env'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  reporter: [['list']],
  globalSetup: './e2e/global-setup.ts',
  use: { baseURL: E2E_BASE_URL, screenshot: 'only-on-failure', trace: 'retain-on-failure' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    // Own Postgres, migrations, seed, production build. Never the dev database.
    command: 'node scripts/e2e-server.mjs',
    url: `${E2E_BASE_URL}/en`,
    reuseExistingServer: false,
    stdout: 'pipe',
    timeout: 420_000,
  },
})
