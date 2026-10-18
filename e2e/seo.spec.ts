import { expect, test, type Page } from '@playwright/test'
import { accounts, cityId, login } from './api'
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

async function jsonLd(page: Page) {
  const raw = await page.locator('script[type="application/ld+json"]').first().textContent()
  return JSON.parse(raw ?? 'null') as Record<string, unknown>
}

async function ogImageIsPng(page: Page, request: import('@playwright/test').APIRequestContext) {
  const src = await page.locator('meta[property="og:image"]').first().getAttribute('content')
  expect(src).toBeTruthy()
  const res = await request.get(src!)
  expect(res.status()).toBe(200)
  expect(res.headers()['content-type']).toContain('image/png')
  expect((await res.body()).length).toBeGreaterThan(10_000)
}

test('city page: TouristDestination JSON-LD and a branded social image', async ({ page, request }) => {
  await page.goto('/en/cities/aleppo')
  expect(await jsonLd(page)).toMatchObject({
    '@context': 'https://schema.org',
    '@type': 'TouristDestination',
    name: 'Aleppo',
    url: abs('/en/cities/aleppo'),
    inLanguage: 'en',
  })
  await ogImageIsPng(page, request)
  // Its own card, not the default one.
  await expect(page.locator('meta[property="og:image"]')).toHaveCount(1)
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', /\/cities\/aleppo\/opengraph-image/)
})

test('published season report: Article JSON-LD with author and dates, and its own social image', async ({ page, request }) => {
  const auth = login(accounts.admin)
  const city = await cityId(request, 'latakia')
  const res = await request.post('/api/seasonReports', {
    headers: auth,
    data: { title: 'قطاف الزيتون بالساحل', city, fieldDate: '2026-11-05T00:00:00.000Z', _status: 'published' },
  })
  expect(res.status(), await res.text()).toBe(201)
  const { slug } = ((await res.json()) as { doc: { slug: string } }).doc

  await expect(async () => {
    const r = await page.goto(`/seasons/${slug}`)
    expect(r?.status()).toBe(200)
  }).toPass({ timeout: 5000 })
  expect(await jsonLd(page)).toMatchObject({
    '@type': 'Article',
    headline: 'قطاف الزيتون بالساحل',
    inLanguage: 'ar',
    datePublished: '2026-11-05T00:00:00.000Z',
    author: { '@type': 'Person', name: 'المدير' },
    publisher: { '@type': 'Organization', name: 'سوريا عن قرب' },
  })
  await ogImageIsPng(page, request)
})

test('every other page gets the default social image', async ({ page, request }) => {
  await page.goto('/about')
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', abs('/og'))
  await ogImageIsPng(page, request)
  await page.goto('/en/outside')
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', abs('/en/og'))
})
