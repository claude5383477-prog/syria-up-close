import { defineConfig, devices } from '@playwright/test'

// Post-deployment check against a running site (default: production). Not part of `npm run test:e2e`.
//   npm run check:prod                      → https://syria-up-close.vercel.app, accounts from .env.production.local
//   PROD_URL=… PROD_ENV_FILE=… npm run check:prod
// Accounts are read from the env file inside the test; nothing records the session: no trace, no video,
// no screenshots, so no password ends up in an artifact.
export default defineConfig({
  testDir: './e2e-prod',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 120_000,
  reporter: [['list'], ['json', { outputFile: 'test-results/prod-check.json' }]],
  use: {
    baseURL: process.env.PROD_URL ?? 'https://syria-up-close.vercel.app',
    trace: 'off',
    video: 'off',
    screenshot: 'off',
    reducedMotion: 'reduce',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
})
