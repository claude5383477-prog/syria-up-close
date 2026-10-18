import { expect, test } from '@playwright/test'
import { E2E_BASE_URL } from './env'

const abs = (p: string) => `${E2E_BASE_URL}${p}`

test('bilingual page: absolute canonical and hreflang ar/en/x-default', async ({ page }) => {
  await page.goto('/en/cities/damascus')
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', abs('/en/cities/damascus'))
  await expect(page.locator('link[rel="alternate"][hreflang="ar"]')).toHaveAttribute('href', abs('/cities/damascus'))
  await expect(page.locator('link[rel="alternate"][hreflang="en"]')).toHaveAttribute('href', abs('/en/cities/damascus'))
  await expect(page.locator('link[rel="alternate"][hreflang="x-default"]')).toHaveAttribute('href', abs('/cities/damascus'))
  await expect(page.locator('meta[name="robots"]')).toHaveCount(0)
  await expect(page.locator('meta[property="og:locale"]')).toHaveAttribute('content', 'en_US')
  await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /Narrow lanes/)
})

test('home uses the bare site name as its title', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveTitle('سوريا عن قرب')
  await page.goto('/en')
  await expect(page).toHaveTitle('Syria Up Close')
})

test('Arabic-only section: no English alternate; the /en copy is noindex and canonical to Arabic', async ({ page }) => {
  await page.goto('/seasons')
  await expect(page.locator('link[rel="alternate"][hreflang="en"]')).toHaveCount(0)
  await page.goto('/en/inside')
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/)
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', abs('/inside'))
})

test('sitemap.xml: published pages with language alternates, nothing private or Arabic-only in English', async ({ request }) => {
  const xml = await (await request.get('/sitemap.xml')).text()
  for (const p of ['/', '/en', '/cities/damascus', '/en/cities/damascus', '/inside', '/seasons', '/about', '/en/about']) {
    expect(xml, p).toContain(`<loc>${abs(p)}</loc>`)
  }
  expect(xml).toMatch(/hreflang="en"\s+href="[^"]*\/en\/cities\/damascus"/)
  for (const p of ['/en/inside', '/en/seasons', '/admin', '/correspondent', '/kit']) expect(xml, p).not.toContain(`<loc>${abs(p)}</loc>`)
})

test('robots.txt keeps crawlers out of the admin, API, correspondent app and kit', async ({ request }) => {
  const txt = await (await request.get('/robots.txt')).text()
  for (const p of ['/admin', '/api/', '/correspondent', '/kit']) expect(txt).toContain(`Disallow: ${p}`)
  expect(txt).toContain(`Sitemap: ${abs('/sitemap.xml')}`)
})
