// SEO day 5 (GEO): what crawlers that run no JavaScript receive. Same rules as `npm run geo:audit`
// (src/lib/geoAudit), on the hermetic production build.
import { expect, test, type APIRequestContext } from '@playwright/test'
import { E2E_BASE_URL } from './env'
import { CRAWLERS, blocked, faqFacts, geoFacts, jsonLd, payloadText } from '../src/lib/geoAudit'

// The hermetic database has only the seed's cities: take every Arabic city page its sitemap lists.
const SAMPLE = ['/', '/en/cities/damascus', '/inside/bloudan']

async function cityPages(request: APIRequestContext): Promise<string[]> {
  const xml = await (await request.get('/sitemaps/cities.xml')).text()
  return [...xml.matchAll(/<url><loc>([^<]+)<\/loc>/g)].map((m) => decodeURI(new URL(m[1]!).pathname)).filter((p) => p.startsWith('/cities/'))
}

/** Words Next carries on every page for its own not-found boundary (the audit script does the same). */
async function boundary(request: APIRequestContext) {
  return new Set(payloadText(await (await request.get('/geo-e2e-404-probe')).text()))
}

async function firstReport(request: APIRequestContext): Promise<string | null> {
  const xml = await (await request.get('/sitemaps/seasons.xml')).text()
  const loc = xml.match(/<url><loc>([^<]+)<\/loc>/)?.[1]
  return loc ? new URL(loc).pathname : null
}

test('every crawler robots.txt lets in gets the full page, and all of its text is in the first HTML', async ({ request }) => {
  test.setTimeout(180_000)
  const ignore = await boundary(request)
  const report = await firstReport(request)
  const cities = await cityPages(request)
  expect(cities).toContain('/cities/damascus')
  for (const path of [...SAMPLE, ...cities, ...(report ? [report] : [])]) {
    for (const c of CRAWLERS) {
      const res = await request.get(encodeURI(path), { headers: { 'User-Agent': c.ua }, maxRedirects: 0 })
      const html = await res.text()
      expect(res.status(), `${c.name} ${path}`).toBe(200)
      expect(blocked(res.status(), html), `${c.name} ${path}`).toBeNull()
      const f = geoFacts(html, ignore)
      expect(f.h1, path).not.toBe('')
      expect(f.jsOnly, `${path}: text only JavaScript shows`).toEqual([])
      expect(f.times.invalid, `${path}: <time> without a valid datetime`).toEqual([])
      expect(f.times.labelled, `${path}: a labelled date outside <time>`).toEqual([])
    }
  }
})

test('the «باختصار» box comes before the map and the lists on Arabic city and countryside pages', async ({ request }) => {
  for (const path of ['/cities/damascus', '/inside/bloudan']) {
    const f = geoFacts(await (await request.get(path)).text())
    expect(f.short, path).toBe(true)
    expect(f.shortEarly, path).toBe(true)
  }
})

test('FAQPage carries exactly the questions the page shows', async ({ request }) => {
  for (const path of ['/cities/damascus', '/inside/bloudan']) {
    const faq = faqFacts(await (await request.get(path)).text())
    expect(faq.shown.length, path).toBeGreaterThan(0)
    expect(faq.inSchema, path).toEqual(faq.shown)
  }
})

test('trust signals: how-we-check link, Article author and dates, the Organization as publisher', async ({ request }) => {
  const city = await (await request.get('/cities/damascus')).text()
  expect(city).toContain('href="/about#how-we-check"')
  // Season reports come and go in this database; check one when there is one.
  const report = await firstReport(request)
  if (!report) return
  const html = await (await request.get(report)).text()
  expect(html).toContain('href="/about#how-we-check"')
  const article = jsonLd(html).find((n) => n['@type'] === 'Article')!
  expect(article.datePublished).toMatch(/^\d{4}-\d\d-\d\d/)
  expect(article.dateModified).toMatch(/^\d{4}-\d\d-\d\d/)
  expect(article.publisher).toEqual({ '@id': `${E2E_BASE_URL}/#org` })
  const author = article.author as Record<string, unknown>
  // A named writer, or the guide itself: never a Person without a name.
  if (author['@type'] === 'Person') expect(String(author.name ?? '').trim()).not.toBe('')
  else expect(author).toEqual({ '@id': `${E2E_BASE_URL}/#org` })
})

test('llms.txt lists only sitemap pages, each answering 200', async ({ request }) => {
  test.setTimeout(120_000)
  const res = await request.get('/llms.txt')
  expect(res.status()).toBe(200)
  expect(res.headers()['content-type']).toContain('text/plain')
  const body = await res.text()
  expect(body.startsWith('# سوريا عن قرب | Syria Up Close\n')).toBe(true)
  const sitemap = (await Promise.all(['pages', 'cities', 'countryside', 'seasons', 'first-visit'].map(async (s) => (await request.get(`/sitemaps/${s}.xml`)).text()))).join('\n')
  const locs = new Set([...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => decodeURI(m[1]!)))
  const links = [...body.matchAll(/\]\((http[^)#]+)\)/g)].map((m) => decodeURI(m[1]!))
  expect(links.length).toBeGreaterThan(5)
  for (const link of links) {
    if (/\/(sitemap\.xml|about|blog)$/.test(link)) continue
    expect(locs.has(link), link).toBe(true)
    expect((await request.get(encodeURI(link), { maxRedirects: 0 })).status(), link).toBe(200)
  }
})
