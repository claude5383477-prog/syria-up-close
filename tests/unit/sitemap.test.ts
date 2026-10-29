import { describe, expect, it } from 'vitest'
import { isSitemapSection, latest, sectionPages, sectionPath, sitemapIndexXml, sitemapUrls, urlsetXml, type SitemapSnapshot } from '@/lib/sitemap'

const base = 'https://www.upclosesyria.com'

const snap: SitemapSnapshot = {
  cities: [
    { id: 1, slug: 'damascus', parentCity: null, updatedAt: '2026-10-01T00:00:00.000Z', translated: true, images: ['/guide/u-damascus-0.webp'] },
    { id: 2, slug: 'bloudan', parentCity: 1, updatedAt: '2026-10-02T00:00:00.000Z', translated: false, images: [] },
    { id: 3, slug: 'aleppo', parentCity: null, updatedAt: '2026-10-03T00:00:00.000Z', translated: false, images: [] },
  ],
  children: [
    // Only a status item changed in Damascus: the city page's lastmod follows it.
    { city: 1, at: '2026-10-20T08:00:00.000Z' },
    { city: 1, at: '2026-10-05T00:00:00.000Z', image: 'https://abc123.public.blob.vercel-storage.com/media/souq.webp' },
    { city: 2, at: '2026-10-25T00:00:00.000Z', image: '/api/media/file/spring.webp' },
  ],
  trips: [
    { path: '/inside/bloudan', fromCity: 1, place: 2, at: '2026-10-10T00:00:00.000Z', images: ['/guide/trip.webp'] },
    { path: '/inside/maaloula', fromCity: 1, place: null, at: '2026-10-11T00:00:00.000Z', images: [] },
  ],
  reports: [{ slug: 'olives', at: '2026-10-12T00:00:00.000Z', images: [] }],
  firstVisit: [
    { topic: 'visa', at: '2026-10-13T00:00:00.000Z', translated: true },
    { topic: 'money', at: null, translated: false },
  ],
  stories: [{ slug: 'qasioun', at: '2026-10-24', translated: true, images: ['/guide/a.webp', '/guide/a.webp'] }],
  guides: [{ slug: 'rami', at: '2026-10-21T00:00:00.000Z', translated: false, images: [] }],
  videos: [{ at: '2026-10-22T00:00:00.000Z' }],
}

describe('latest', () => {
  it('picks the newest valid date and ignores empty or broken ones', () => {
    expect(latest('2026-10-01T00:00:00.000Z', null, undefined, 'not a date', '2026-10-02')).toBe('2026-10-02T00:00:00.000Z')
    expect(latest(null, undefined)).toBeUndefined()
    expect(latest()).toBeUndefined()
  })
})

describe('sections', () => {
  it('knows its sections and where they are served', () => {
    expect(isSitemapSection('cities')).toBe(true)
    expect(isSitemapSection('admin')).toBe(false)
    expect(sectionPath('first-visit')).toBe('/sitemaps/first-visit.xml')
  })

  it('city page: newest of the city, what it shows (a status item) and its countryside trips; resorts are left out', () => {
    const pages = sectionPages('cities', snap)
    expect(pages.map((p) => p.path)).toEqual(['/cities/damascus', '/cities/aleppo'])
    expect(pages[0]).toEqual({
      path: '/cities/damascus',
      translated: true,
      lastmod: '2026-10-20T08:00:00.000Z',
      images: ['/guide/u-damascus-0.webp', 'https://abc123.public.blob.vercel-storage.com/media/souq.webp'],
    })
    expect(pages[1]?.lastmod).toBe('2026-10-03T00:00:00.000Z')
  })

  it("countryside page: a resort's trip includes the resort's own content and photos", () => {
    const [bloudan, maaloula] = sectionPages('countryside', snap)
    expect(bloudan).toEqual({ path: '/inside/bloudan', lastmod: '2026-10-25T00:00:00.000Z', images: ['/guide/trip.webp', '/api/media/file/spring.webp'] })
    expect(maaloula).toEqual({ path: '/inside/maaloula', lastmod: '2026-10-11T00:00:00.000Z', images: [] })
  })

  it('static pages take the newest change of what they list; /about has no data date', () => {
    const pages = Object.fromEntries(sectionPages('pages', snap).map((p) => [p.path, p.lastmod]))
    expect(pages).toEqual({
      '/': '2026-10-25T00:00:00.000Z',
      '/cities': '2026-10-03T00:00:00.000Z',
      '/outside': '2026-10-13T00:00:00.000Z',
      '/outside/first-visit': '2026-10-13T00:00:00.000Z',
      '/inside': '2026-10-11T00:00:00.000Z',
      '/seasons': '2026-10-12T00:00:00.000Z',
      '/blog': '2026-10-24T00:00:00.000Z',
      '/guides': '2026-10-21T00:00:00.000Z',
      '/videos': '2026-10-22T00:00:00.000Z',
      '/about': undefined,
    })
  })

  it('season reports, first-visit pages and the blog', () => {
    expect(sectionPages('seasons', snap)).toEqual([{ path: '/seasons/olives', lastmod: '2026-10-12T00:00:00.000Z', images: [] }])
    expect(sectionPages('first-visit', snap)).toEqual([
      { path: '/outside/first-visit/visa', translated: true, lastmod: '2026-10-13T00:00:00.000Z' },
      { path: '/outside/first-visit/money', translated: false, lastmod: undefined },
    ])
    expect(sectionPages('blog', snap)[0]?.lastmod).toBe('2026-10-24T00:00:00.000Z')
  })

  it('guide pages (batch 4): one per published guide; English only once translated', () => {
    expect(sectionPages('guides', snap)).toEqual([{ path: '/guides/rami', translated: false, lastmod: '2026-10-21T00:00:00.000Z', images: [] }])
    expect(sitemapUrls(base, sectionPages('guides', snap)).map((u) => u.loc)).toEqual([`${base}/guides/rami`])
  })
})

describe('sitemapUrls', () => {
  it('splits pages into their indexable language URLs (lib/seo), with absolute de-duplicated images', () => {
    expect(sitemapUrls(base, sectionPages('blog', snap))).toEqual([
      { loc: `${base}/blog/qasioun`, lastmod: '2026-10-24T00:00:00.000Z', images: [`${base}/guide/a.webp`] },
      { loc: `${base}/en/blog/qasioun`, lastmod: '2026-10-24T00:00:00.000Z', images: [`${base}/guide/a.webp`] },
    ])
  })

  it('never lists English for Arabic-only sections or untranslated pages', () => {
    const locs = (['pages', 'cities', 'countryside', 'seasons', 'first-visit'] as const).flatMap((s) => sitemapUrls(base, sectionPages(s, snap)).map((u) => u.loc))
    expect(locs).toContain(`${base}/en`)
    expect(locs).toContain(`${base}/en/cities/damascus`)
    for (const p of ['/en/inside', '/en/seasons', '/en/inside/bloudan', '/en/seasons/olives', '/en/cities/aleppo', '/en/outside/first-visit/money']) expect(locs).not.toContain(`${base}${p}`)
    expect(locs.every((l) => l.startsWith(`${base}/`) || l === base)).toBe(true)
  })

  it('makes a relative image without a leading slash absolute too', () => {
    expect(sitemapUrls(base, [{ path: '/about', images: ['guide/x.webp'] }])).toEqual([
      { loc: `${base}/about`, images: [`${base}/guide/x.webp`] },
      { loc: `${base}/en/about`, images: [`${base}/guide/x.webp`] },
    ])
  })
})

describe('XML', () => {
  it('urlset: loc, lastmod and images, escaped; no hreflang (it lives in each page head)', () => {
    const xml = urlsetXml([
      { loc: `${base}/cities/damascus`, lastmod: '2026-10-20T08:00:00.000Z', images: [`${base}/a.webp?x=1&y=2`] },
      { loc: `${base}/about`, images: [] },
    ])
    expect(xml).toBe(
      '<?xml version="1.0" encoding="UTF-8"?>\n' +
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n' +
        `<url><loc>${base}/cities/damascus</loc><lastmod>2026-10-20T08:00:00.000Z</lastmod><image:image><image:loc>${base}/a.webp?x=1&amp;y=2</image:loc></image:image></url>\n` +
        `<url><loc>${base}/about</loc></url>\n` +
        '</urlset>\n',
    )
    expect(xml).not.toContain('hreflang')
  })

  it('escapes every XML special character', () => {
    expect(urlsetXml([{ loc: `${base}/<a>"'`, images: [] }])).toContain('<loc>https://www.upclosesyria.com/&lt;a&gt;&quot;&apos;</loc>')
  })

  it('index: one <sitemap> per section at /sitemaps/<section>.xml, lastmod when known', () => {
    expect(sitemapIndexXml(base, [{ section: 'pages', lastmod: '2026-10-25T00:00:00.000Z' }, { section: 'blog' }])).toBe(
      '<?xml version="1.0" encoding="UTF-8"?>\n' +
        '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
        `<sitemap><loc>${base}/sitemaps/pages.xml</loc><lastmod>2026-10-25T00:00:00.000Z</lastmod></sitemap>\n` +
        `<sitemap><loc>${base}/sitemaps/blog.xml</loc></sitemap>\n` +
        '</sitemapindex>\n',
    )
  })
})
