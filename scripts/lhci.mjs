// npm run lhci: Lighthouse CI (mobile profile, 3 runs, median) on the hermetic e2e server.
// Uses Playwright's Chromium so no separate Chrome install is needed. Thresholds: lighthouserc.json.
import { chromium } from '@playwright/test'
import { spawnSync } from 'node:child_process'

const env = { ...process.env, CHROME_PATH: process.env.CHROME_PATH ?? chromium.executablePath() }
const r = spawnSync(process.execPath, ['node_modules/@lhci/cli/src/cli.js', 'autorun'], { env, stdio: 'inherit' })
process.exit(r.status ?? 1)
