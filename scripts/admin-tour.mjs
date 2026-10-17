// Screenshots of the Arabic admin as admin and as the seeded Damascus correspondent (checkpoint B review).
// Needs a running server (BASE_URL, default http://localhost:3101) and the SEED_* accounts in .env.
import { chromium } from '@playwright/test'
import { mkdirSync } from 'node:fs'

process.loadEnvFile?.('.env')
const BASE = process.env.BASE_URL ?? 'http://localhost:3101'
const OUT = 'e2e/__screenshots__/admin'
mkdirSync(OUT, { recursive: true })

const browser = await chromium.launch()

async function tour(label, email, password, pages) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 860 }, locale: 'ar' })
  const page = await ctx.newPage()
  await page.goto(`${BASE}/admin/login`)
  await page.waitForSelector('input[name="email"]')
  if (label === 'admin') await page.screenshot({ path: `${OUT}/0-login.png` })
  await page.fill('input[name="email"]', email)
  await page.fill('input[name="password"]', password)
  await page.click('button[type="submit"]')
  await page.waitForURL((u) => !u.pathname.endsWith('/login'), { timeout: 30_000 })
  for (const [name, path] of pages) {
    await page.goto(`${BASE}${path}`)
    await page.waitForLoadState('networkidle').catch(() => {})
    await page.waitForTimeout(800)
    await page.screenshot({ path: `${OUT}/${label}-${name}.png`, fullPage: true })
  }
  await ctx.close()
}

await tour('admin', process.env.SEED_ADMIN_EMAIL, process.env.SEED_ADMIN_PASSWORD, [
  ['1-dashboard', '/admin'],
  ['2-cities', '/admin/collections/cities'],
  ['3-status-new', '/admin/collections/statusItems/create'],
  ['4-first-visit', '/admin/collections/firstVisitPages'],
  ['5-settings', '/admin/globals/siteSettings'],
])
await tour('correspondent', process.env.SEED_CORRESPONDENT_EMAIL, process.env.SEED_CORRESPONDENT_PASSWORD, [
  ['1-dashboard', '/admin'],
  ['2-status-new', '/admin/collections/statusItems/create'],
])
await browser.close()
console.log(`screenshots in ${OUT}`)
