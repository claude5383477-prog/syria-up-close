import { indexablePaths } from '@/lib/seo'

// Sitemap index and its section files (SEO day 3). Pure: the data comes from data/sitemap, so the
// rules (which URLs, which lastmod, which images) are unit-tested without a database.

export const SITEMAP_SECTIONS = ['pages', 'cities', 'countryside', 'seasons', 'first-visit', 'blog', 'guides'] as const
export type SitemapSection = (typeof SITEMAP_SECTIONS)[number]

export const isSitemapSection = (v: string): v is SitemapSection => (SITEMAP_SECTIONS as readonly string[]).includes(v)

/** Where a section file is served (app/sitemaps/[file]/route.ts). */
export const sectionPath = (s: SitemapSection) => `/sitemaps/${s}.xml`

type When = string | null | undefined

/** The most recent of the given dates (ISO), or undefined when none is valid. */
export function latest(...dates: When[]): string | undefined {
  let best: number | undefined
  for (const d of dates) {
    const t = d ? Date.parse(d) : NaN
    if (!Number.isNaN(t) && (best === undefined || t > best)) best = t
  }
  return best === undefined ? undefined : new Date(best).toISOString()
}

/** A city with the dates of everything its page shows (places, stays, venues, lore, photos, status). */
export type SnapCity = { id: number; slug: string; parentCity: number | null; updatedAt: When; translated: boolean; images: string[] }
/** One row shown on a city page: its city, when it last changed, and its photo if any. */
export type SnapChild = { city: number; at: When; image?: string | null }
export type SnapTrip = { path: string; fromCity: number | null; place: number | null; at: When; images: string[] }
export type SnapReport = { slug: string; at: When; images: string[] }
export type SnapFirstVisit = { topic: string; at: When; translated: boolean }
export type SnapStory = { slug: string; at: When; translated: boolean; images: string[] }
/** Batch 4: a published tour guide (its own page) and a published video (on /videos). */
export type SnapGuide = { slug: string; at: When; translated: boolean; images: string[] }
export type SnapVideo = { at: When }

export type SitemapSnapshot = {
  cities: SnapCity[]
  children: SnapChild[]
  trips: SnapTrip[]
  reports: SnapReport[]
  firstVisit: SnapFirstVisit[]
  stories: SnapStory[]
  guides: SnapGuide[]
  videos: SnapVideo[]
}

/** A page before it is split into its indexable language URLs. */
export type SitemapPage = { path: string; translated?: boolean; lastmod?: string; images?: string[] }

function cityParts(snap: SitemapSnapshot, cityId: number | null) {
  if (cityId == null) return { dates: [] as When[], images: [] as string[] }
  const city = snap.cities.find((c) => c.id === cityId)
  const kids = snap.children.filter((k) => k.city === cityId)
  return {
    dates: [city?.updatedAt, ...kids.map((k) => k.at)],
    images: [...(city?.images ?? []), ...kids.flatMap((k) => (k.image ? [k.image] : []))],
  }
}

const max = (rows: { at: When }[]) => latest(...rows.map((r) => r.at))

/** The pages of one section, each with the last real change of what it shows. */
export function sectionPages(section: SitemapSection, snap: SitemapSnapshot): SitemapPage[] {
  const main = snap.cities.filter((c) => c.parentCity == null)
  switch (section) {
    case 'pages': {
      const cities = latest(...main.map((c) => c.updatedAt))
      const firstVisit = max(snap.firstVisit)
      const everything = latest(cities, max(snap.children), max(snap.trips), max(snap.reports), firstVisit, max(snap.stories), max(snap.guides), max(snap.videos))
      return [
        { path: '/', lastmod: everything },
        { path: '/cities', lastmod: cities },
        { path: '/outside', lastmod: firstVisit },
        { path: '/outside/first-visit', lastmod: firstVisit },
        { path: '/inside', lastmod: max(snap.trips) },
        { path: '/seasons', lastmod: max(snap.reports) },
        { path: '/blog', lastmod: max(snap.stories) },
        { path: '/guides', lastmod: max(snap.guides) },
        { path: '/videos', lastmod: max(snap.videos) },
        { path: '/about' },
      ]
    }
    case 'cities':
      return main.map((c) => {
        const own = cityParts(snap, c.id)
        // The city page also lists its countryside trips.
        const trips = snap.trips.filter((t) => t.fromCity === c.id)
        return { path: `/cities/${c.slug}`, translated: c.translated, lastmod: latest(...own.dates, ...trips.map((t) => t.at)), images: own.images }
      })
    case 'countryside':
      return snap.trips.map((t) => {
        // A resort's trip page shows the resort's own places, stays, venues and photos.
        const place = cityParts(snap, t.place)
        return { path: t.path, lastmod: latest(t.at, ...place.dates), images: [...t.images, ...place.images] }
      })
    case 'seasons':
      return snap.reports.map((r) => ({ path: `/seasons/${r.slug}`, lastmod: latest(r.at), images: r.images }))
    case 'first-visit':
      return snap.firstVisit.map((p) => ({ path: `/outside/first-visit/${p.topic}`, translated: p.translated, lastmod: latest(p.at) }))
    case 'blog':
      return snap.stories.map((s) => ({ path: `/blog/${s.slug}`, translated: s.translated, lastmod: latest(s.at), images: s.images }))
    case 'guides':
      return snap.guides.map((g) => ({ path: `/guides/${g.slug}`, translated: g.translated, lastmod: latest(g.at), images: g.images }))
  }
}

export type SitemapUrl = { loc: string; lastmod?: string; images: string[] }

const absolute = (base: string, u: string) => (/^https?:\/\//.test(u) ? u : `${base}${u.startsWith('/') ? '' : '/'}${u}`)

/** Every indexable language URL of the pages (lib/seo rule), with absolute, de-duplicated images. */
export function sitemapUrls(base: string, pages: SitemapPage[]): SitemapUrl[] {
  return pages.flatMap((p) => {
    const images = [...new Set((p.images ?? []).map((i) => absolute(base, i)))]
    return indexablePaths(p.path, p.translated ?? true).map((path) => ({ loc: `${base}${path}`, ...(p.lastmod ? { lastmod: p.lastmod } : {}), images }))
  })
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;')

const XML = '<?xml version="1.0" encoding="UTF-8"?>\n'

/** A <urlset> with Google's image extension. Language alternates live in each page's <head>, not here. */
export function urlsetXml(urls: SitemapUrl[]): string {
  const rows = urls.map((u) =>
    [
      '<url>',
      `<loc>${esc(u.loc)}</loc>`,
      ...(u.lastmod ? [`<lastmod>${u.lastmod}</lastmod>`] : []),
      ...u.images.map((i) => `<image:image><image:loc>${esc(i)}</image:loc></image:image>`),
      '</url>',
    ].join(''),
  )
  return `${XML}<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n${rows.join('\n')}\n</urlset>\n`
}

/** The sitemap index served at /sitemap.xml: one entry per section, with its newest lastmod. */
export function sitemapIndexXml(base: string, sections: { section: SitemapSection; lastmod?: string }[]): string {
  const rows = sections.map((s) => `<sitemap><loc>${esc(`${base}${sectionPath(s.section)}`)}</loc>${s.lastmod ? `<lastmod>${s.lastmod}</lastmod>` : ''}</sitemap>`)
  return `${XML}<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${rows.join('\n')}\n</sitemapindex>\n`
}

export const XML_HEADERS = { 'Content-Type': 'application/xml; charset=utf-8' } as const
