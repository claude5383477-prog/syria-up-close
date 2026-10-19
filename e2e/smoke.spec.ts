import { expect, test } from '@playwright/test'

test('english home renders ltr', async ({ page }) => {
  await page.goto('/en')
  await expect(page.locator('html')).toHaveAttribute('dir', 'ltr')
})

test('fonts are self-hosted (no runtime request to Google Fonts)', async ({ page }) => {
  const external: string[] = []
  page.on('request', (r) => {
    if (/fonts\.(googleapis|gstatic)\.com/.test(r.url())) external.push(r.url())
  })
  await page.goto('/')
  await page.evaluate(() => document.fonts.ready)
  expect(external).toEqual([])
  const family = await page.evaluate(() => getComputedStyle(document.body).fontFamily)
  expect(family).toMatch(/IBM Plex Sans Arabic/i)
})

test('every page sends the anti-framing and basic security headers', async ({ request }) => {
  for (const path of ['/', '/en/cities/damascus', '/correspondent/login', '/admin/login']) {
    const res = await request.get(path)
    expect(res.status(), path).toBeLessThan(400)
    const h = res.headers()
    expect(h['x-frame-options'], path).toBe('SAMEORIGIN')
    expect(h['content-security-policy'], path).toContain("frame-ancestors 'self'")
    expect(h['x-content-type-options'], path).toBe('nosniff')
    expect(h['referrer-policy'], path).toBe('strict-origin-when-cross-origin')
  }
})
