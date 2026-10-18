// Prints what a page downloads (compressed transfer per resource, fonts listed separately).
// Usage: node scripts/weigh.mjs http://localhost:3101/correspondent/login
import { chromium } from '@playwright/test'

const url = process.argv[2]
const browser = await chromium.launch()
const page = await browser.newPage()
const rows = []
page.on('requestfinished', async (req) => {
  const s = await req.sizes().catch(() => null)
  if (s) rows.push({ type: req.resourceType(), kb: (s.responseBodySize + s.responseHeadersSize) / 1024, url: req.url().replace(/^https?:\/\/[^/]+/, '') })
})
await page.goto(url, { waitUntil: 'networkidle' })
await browser.close()
rows.sort((a, b) => b.kb - a.kb)
for (const r of rows) console.log(`${r.type.padEnd(10)} ${r.kb.toFixed(1).padStart(7)}KB  ${r.url.slice(0, 90)}`)
const total = (f) => rows.filter(f).reduce((s, r) => s + r.kb, 0).toFixed(1)
console.log(`total without fonts: ${total((r) => r.type !== 'font')}KB   fonts: ${total((r) => r.type === 'font')}KB`)
