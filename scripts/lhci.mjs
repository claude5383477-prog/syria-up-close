// npm run lhci: Lighthouse CI (mobile profile, 3 runs, median) on the hermetic e2e server.
// npm run lhci -- https://site.org: the same three pages and thresholds on a deployed site.
// Uses Playwright's Chromium so no separate Chrome install is needed. Thresholds: lighthouserc.json.
import { chromium } from '@playwright/test'
import { spawnSync } from 'node:child_process'
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const PAGES = ['/', '/cities/damascus', '/correspondent/login']
const env = { ...process.env, CHROME_PATH: process.env.CHROME_PATH ?? chromium.executablePath() }
const args = ['node_modules/@lhci/cli/src/cli.js', 'autorun']

const base = process.argv[2]?.replace(/\/+$/, '')
if (base) {
  // Same config, minus the local server, pointed at the deployed pages.
  const rc = JSON.parse(readFileSync('lighthouserc.json', 'utf8'))
  delete rc.ci.collect.startServerCommand
  delete rc.ci.collect.startServerReadyPattern
  delete rc.ci.collect.startServerReadyTimeout
  rc.ci.collect.url = PAGES.map((p) => `${base}${p}`)
  const file = join(mkdtempSync(join(tmpdir(), 'lhci-')), 'lighthouserc.json')
  writeFileSync(file, JSON.stringify(rc, null, 2))
  args.push(`--config=${file}`)
}
const r = spawnSync(process.execPath, args, { env, stdio: 'inherit' })
process.exit(r.status ?? 1)
