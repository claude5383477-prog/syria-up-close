import { expect, test, type Page } from '@playwright/test'
import { accounts, cityId, login } from './api'
import { E2E_BASE_URL, E2E_INDEXNOW_KEY } from './env'

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

const SECTIONS = ['pages', 'cities', 'countryside', 'seasons', 'first-visit', 'blog']

/** Every <loc> of the sitemap: the index at /sitemap.xml, then each section file it lists. */
async function sitemapLocs(request: import('@playwright/test').APIRequestContext) {
  const index = await request.get('/sitemap.xml')
  expect(index.status()).toBe(200)
  expect(index.headers()['content-type']).toContain('xml')
  const xml = await index.text()
  expect(xml).toMatch(/^<\?xml version="1.0" encoding="UTF-8"\?>\n<sitemapindex xmlns="http:\/\/www.sitemaps.org\/schemas\/sitemap\/0.9">/)
  const files = [...xml.matchAll(/<sitemap><loc>([^<]+)<\/loc>/g)].map((m) => m[1]!)
  expect(files).toEqual(SECTIONS.map((s) => abs(`/sitemaps/${s}.xml`)))
  const sections: Record<string, string> = {}
  for (const [i, f] of files.entries()) {
    const res = await request.get(f)
    expect(res.status(), f).toBe(200)
    expect(res.headers()['content-type'], f).toContain('xml')
    const body = await res.text()
    expect(body, f).toMatch(/<urlset [^>]*>[\s\S]*<\/urlset>\n$/)
    // Well-formed enough for a crawler: every <url> closes, and no stray "&".
    expect(body.split('<url>').length, f).toBe(body.split('</url>').length)
    expect(body, f).not.toMatch(/&(?!amp;|lt;|gt;|quot;|apos;)/)
    sections[SECTIONS[i]!] = body
  }
  const all = Object.values(sections).join('\n')
  return { sections, locs: [...all.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]!), all }
}

test('sitemap.xml is an index of section files; published pages only, nothing private or Arabic-only in English', async ({ request }) => {
  const { locs, sections, all } = await sitemapLocs(request)
  for (const p of ['/', '/en', '/cities/damascus', '/en/cities/damascus', '/inside', '/seasons', '/about', '/en/about']) expect(locs, p).toContain(abs(p))
  for (const p of ['/en/inside', '/en/seasons', '/admin', '/correspondent', '/kit']) expect(locs, p).not.toContain(abs(p))
  expect(locs.every((l) => l.startsWith(`${E2E_BASE_URL}/`))).toBe(true)
  expect(new Set(locs).size).toBe(locs.length)
  // hreflang lives in each page's <head> only.
  expect(all).not.toContain('hreflang')
  // Every city page carries a real lastmod and the site's own photos.
  expect(sections.cities).toMatch(/<loc>[^<]*\/cities\/damascus<\/loc><lastmod>\d{4}-\d\d-\d\dT[^<]+<\/lastmod><image:image><image:loc>[^<]+<\/image:loc>/)
  expect(all).not.toMatch(/<image:loc>https:\/\/(upload|thumb)\.wikimedia\.org/)
})

test('every sitemap URL answers 200 without a redirect and is indexable', async ({ request }) => {
  test.setTimeout(180_000)
  const { locs } = await sitemapLocs(request)
  for (const loc of locs) {
    const res = await request.get(loc, { maxRedirects: 0 })
    expect(res.status(), loc).toBe(200)
    const html = await res.text()
    expect(html, loc).not.toMatch(/<meta name="robots" content="[^"]*noindex/)
  }
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
  // Rendered on request, so the CDN (Vercel's edge) must be allowed to keep it.
  expect(res.headers()['cache-control']).toMatch(/s-maxage=\d+/)
}

test('city page: WebPage + TouristDestination JSON-LD and a branded social image', async ({ page, request }) => {
  await page.goto('/en/cities/aleppo')
  // The page carries the language; the destination is its main entity (TouristDestination has no inLanguage).
  expect(await jsonLd(page)).toMatchObject({
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'WebPage', url: abs('/en/cities/aleppo'), inLanguage: 'en', mainEntity: { '@id': abs('/en/cities/aleppo#destination') } },
      { '@type': 'TouristDestination', '@id': abs('/en/cities/aleppo#destination'), name: 'Aleppo', url: abs('/en/cities/aleppo') },
    ],
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
  // Publishing refreshes the sitemap too (hooks/revalidate).
  await expect(async () => {
    expect(await (await request.get('/sitemaps/seasons.xml')).text()).toContain(abs(`/seasons/${slug}`))
  }).toPass({ timeout: 10_000 })
})

test('every other page gets the default social image', async ({ page, request }) => {
  await page.goto('/about')
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', abs('/og'))
  await ogImageIsPng(page, request)
  await page.goto('/en/outside')
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', abs('/en/og'))
})

test('home: WebSite published by the Organization, square PNG logo that loads, no invented accounts', async ({ page, request }) => {
  await page.goto('/')
  const ld = (await jsonLd(page)) as { '@graph': Record<string, unknown>[] }
  const site = ld['@graph'].find((n) => n['@type'] === 'WebSite')
  const org = ld['@graph'].find((n) => n['@type'] === 'Organization')
  expect(site).toMatchObject({ '@id': abs('/#site'), name: 'سوريا عن قرب', alternateName: 'Syria Up Close', publisher: { '@id': abs('/#org') } })
  expect(org).toMatchObject({ '@id': abs('/#org'), name: 'سوريا عن قرب', alternateName: 'Syria Up Close', url: abs('/'), logo: { '@type': 'ImageObject', url: abs('/icon-512.png'), width: 512, height: 512 } })
  expect(org).not.toHaveProperty('sameAs')
  expect(JSON.stringify(ld)).not.toContain('SearchAction')
  const logo = await request.get(abs('/icon-512.png'))
  expect(logo.status()).toBe(200)
  expect(logo.headers()['content-type']).toBe('image/png')
})

test('IndexNow key file at the root, from the environment', async ({ request }) => {
  const res = await request.get('/indexnow-key.txt')
  expect(res.status()).toBe(200)
  expect(res.headers()['content-type']).toContain('text/plain')
  expect(await res.text()).toBe(E2E_INDEXNOW_KEY)
})
