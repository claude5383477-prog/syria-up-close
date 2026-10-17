import { defineConfig, devices } from '@playwright/test'
import base from './playwright.config'

// `npm run screens`: review screenshots (site + prototype) on the same hermetic server as e2e.
export default defineConfig({
  ...base,
  testDir: './e2e/screens',
  testMatch: '**/*.screens.ts',
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
})
